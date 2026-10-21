import csv
import hmac
import io
import json
import os
from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask, Response, g, jsonify, request
from flask_cors import CORS
from auth import login_user, require_auth
from db import (
    assign_user_sites,
    can_user_access_site,
    check_if_data_changed,
    create_new_user,
    delete_site_by_id,
    delete_user_by_id,
    get_all_users,
    get_db_connection,
    get_due_sites,
    get_latest_chatbot_site_snapshots,
    get_report_data,
    get_scrape_details,
    get_scrape_history,
    get_scrapes_for_site,
    get_site_by_id,
    get_unique_sites,
    get_user_assigned_site_ids,
    record_site_scraped,
    save_scrape_results,
    update_site_schedule,
    update_user_password,
    update_user_profile,
)
from scraper import scrape_website

app = Flask(__name__)
CORS(app)


@app.route('/api/test-db', methods=['GET'])
def test_db():
    conn = get_db_connection()
    if conn and conn.is_connected():
        conn.close()
        return jsonify({'message': 'Database connection successful'}), 200
    else:
        return jsonify({'message': 'Database connection failed'}), 500


@app.route('/api/login', methods=['POST'])
def login():
    request_data = request.get_json() or {}
    email = request_data.get('email')
    password = request_data.get('password')

    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400
    token, error = login_user(email, password)
    if error:
        return jsonify({'message': error}), 401
    return jsonify({'token': token}), 200


@app.route('/api/me', methods=['GET'])
@require_auth()
def get_current_user():
    return jsonify({
        'user_id': g.user_id,
        'role_id': g.role_id,
        'email': g.email,
        'name': g.user.get('name')
    }), 200


@app.route('/api/scrape', methods=['POST'])
@require_auth(roles=[1, 2])
def scrape():
    request_data = request.get_json() or {}
    url = request_data.get('url')
    cron_interval_hours = request_data.get('cron_interval_hours')

    if not url:
        return jsonify({'message': 'URL is required'}), 400

    scraped_data, error = scrape_website(url)
    if error:
        return jsonify({'message': error}), 500

    has_changed = check_if_data_changed(url, scraped_data)
    if not has_changed:
        return jsonify({
            'message': 'No changes detected. Database update skipped.',
            'results': scraped_data,
            'unchanged': True
        }), 200

    saved, save_msg = save_scrape_results(
        url, scraped_data, user_id=g.user_id, cron_interval_hours=cron_interval_hours
    )
    if not saved:
        return jsonify({'message': save_msg}), 500

    return jsonify({'message': save_msg, 'results': scraped_data}), 200


@app.route('/api/history', methods=['GET'])
@require_auth()
def history():
    data = get_scrape_history()
    return jsonify(data), 200


@app.route('/api/scrape/<int:run_id>', methods=['GET'])
@require_auth()
def get_past_scrape(run_id):
    data = get_scrape_details(run_id)
    if not data:
        return jsonify({'message': 'Run not found'}), 404

    # Permission check: verify caller has access to the website
    if not can_user_access_site(g.user_id, g.role_id, data['website_id']):
        return jsonify({'message': 'Access denied to this site'}), 403

    return jsonify(data), 200


@app.route('/api/sites', methods=['GET'])
@require_auth()
def get_sites():
    sites = get_unique_sites(user_id=g.user_id, role_id=g.role_id)
    return jsonify(sites), 200


@app.route('/api/sites/<int:website_id>', methods=['GET'])
@require_auth()
def get_single_site(website_id):
    if not can_user_access_site(g.user_id, g.role_id, website_id):
        return jsonify({'message': 'Access denied to this site'}), 403
    site = get_site_by_id(website_id)
    if not site:
        return jsonify({'message': 'Website not found'}), 404
    return jsonify(site), 200


@app.route('/api/sites/<int:website_id>/scrapes', methods=['GET'])
@require_auth()
def get_site_scrapes(website_id):
    if not can_user_access_site(g.user_id, g.role_id, website_id):
        return jsonify({'message': 'Access denied to this site'}), 403

    return jsonify(get_scrapes_for_site(website_id)), 200


@app.route('/api/sites/<int:website_id>', methods=['DELETE'])
@require_auth(roles=[1, 2])
def remove_site(website_id):
    success, message = delete_site_by_id(website_id)
    if success:
        return jsonify({'message': message}), 200
    else:
        return jsonify({'message': message}), 400


@app.route('/api/sites/<int:website_id>/schedule', methods=['PUT'])
@require_auth(roles=[1, 2])
def set_site_schedule(website_id):
    data = request.get_json() or {}
    cron_interval_hours = data.get('cron_interval_hours')
    success, msg = update_site_schedule(website_id, cron_interval_hours)
    if success:
        return jsonify({'message': msg}), 200
    return jsonify({'message': msg}), 400


@app.route('/api/sites/<int:website_id>/scrape', methods=['POST'])
@require_auth(roles=[1, 2])
def scrape_single_site(website_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, url, cron_interval_hours FROM websites WHERE id = %s", (website_id,))
    site = cursor.fetchone()
    cursor.close()
    conn.close()

    if not site:
        return jsonify({'message': 'Website not found'}), 404

    url = site['url']
    scraped_data, error = scrape_website(url)
    if error:
        return jsonify({'message': error}), 500

    has_changed = check_if_data_changed(url, scraped_data)
    if not has_changed:
        record_site_scraped(site['id'])
        return jsonify({
            'message': 'No changes detected since last scrape. Database update skipped.',
            'results': scraped_data,
            'unchanged': True
        }), 200

    saved, save_msg = save_scrape_results(
        url, scraped_data, user_id=g.user_id, cron_interval_hours=site.get('cron_interval_hours')
    )
    if not saved:
        return jsonify({'message': save_msg}), 500

    return jsonify({'message': save_msg, 'results': scraped_data}), 200


# ==============================================================================
# User Management Endpoints (Super Admin Only: Role 1)
# ==============================================================================

@app.route('/api/users', methods=['GET'])
@require_auth(roles=[1])
def get_users():
    users = get_all_users()
    return jsonify(users), 200


@app.route('/api/users', methods=['POST'])
@require_auth(roles=[1])
def create_user():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    role_id = data.get('role_id', 3)
    name = data.get('name')

    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400

    success, message = create_new_user(email, password, role_id, name)
    if success:
        return jsonify({'message': message}), 201
    else:
        return jsonify({'message': message}), 400


@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@require_auth(roles=[1])
def remove_user(user_id):
    if user_id == 1:
        return jsonify({'message': 'Primary Super Admin cannot be deleted'}), 400

    success, message = delete_user_by_id(user_id)
    if success:
        return jsonify({'message': message}), 200
    else:
        return jsonify({'message': message}), 400


@app.route('/api/users/<int:user_id>', methods=['PUT'])
@require_auth(roles=[1])
def edit_user(user_id):
    data = request.get_json() or {}
    name = data.get('name')
    email = data.get('email')
    role_id = data.get('role_id')
    password = data.get('password')
    site_ids = data.get('site_ids')

    success, msg = update_user_profile(
        user_id, name=name, email=email, role_id=role_id, password=password
    )
    if not success:
        return jsonify({'message': msg}), 400

    if site_ids is not None and isinstance(site_ids, list):
        assign_user_sites(user_id, site_ids)

    return jsonify({'message': 'User profile updated successfully'}), 200


@app.route('/api/users/<int:user_id>/password', methods=['PUT'])
@require_auth(roles=[1])
def update_password(user_id):
    data = request.get_json() or {}
    new_password = data.get('password')
    if not new_password:
        return jsonify({'message': 'New password is required'}), 400
    success, msg = update_user_password(user_id, new_password)
    if success:
        return jsonify({'message': msg}), 200
    return jsonify({'message': msg}), 400


@app.route('/api/users/<int:user_id>/sites', methods=['GET'])
@require_auth(roles=[1])
def get_user_sites(user_id):
    site_ids = get_user_assigned_site_ids(user_id)
    return jsonify({'user_id': user_id, 'site_ids': site_ids}), 200


@app.route('/api/users/<int:user_id>/sites', methods=['PUT'])
@require_auth(roles=[1])
def set_user_sites(user_id):
    data = request.get_json() or {}
    site_ids = data.get('site_ids', [])
    success, msg = assign_user_sites(user_id, site_ids)
    if success:
        return jsonify({'message': msg}), 200
    return jsonify({'message': msg}), 400


# ==============================================================================
# Scrape History Reports (CSV Exports)
# ==============================================================================

def build_csv_response(rows, filename):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Run ID", "Website URL", "Scraped At (UTC)", "Status", "Tag Type", "Tag Name", "Content"])
    for r in rows:
        started = r.get("started_at")
        started_str = started.isoformat() if hasattr(started, "isoformat") else str(started or "")
        writer.writerow([
            r.get("run_id"),
            r.get("website_url"),
            started_str,
            r.get("run_status") or "completed",
            r.get("tag_type") or "",
            r.get("tag_name") or "",
            r.get("content") or ""
        ])
    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.route('/api/scrape/<int:run_id>/report', methods=['GET'])
@require_auth()
def download_run_report(run_id):
    details = get_scrape_details(run_id)
    if not details:
        return jsonify({'message': 'Run not found'}), 404
    if not can_user_access_site(g.user_id, g.role_id, details['website_id']):
        return jsonify({'message': 'Access denied to this site'}), 403
    rows = get_report_data(run_id=run_id)
    return build_csv_response(rows, f"scrape_run_{run_id}_report.csv")


@app.route('/api/sites/<int:website_id>/report', methods=['GET'])
@require_auth()
def download_site_report(website_id):
    if not can_user_access_site(g.user_id, g.role_id, website_id):
        return jsonify({'message': 'Access denied to this site'}), 403
    rows = get_report_data(website_id=website_id)
    return build_csv_response(rows, f"site_{website_id}_history_report.csv")


@app.route('/api/reports/all', methods=['GET'])
@require_auth()
def download_all_reports():
    rows = get_report_data(user_id=g.user_id, role_id=g.role_id)
    return build_csv_response(rows, "all_sites_scrape_report.csv")


@app.route('/api/integrations/chatbot/sites', methods=['GET'])
def get_chatbot_site_snapshots():
    expected_token = os.getenv("CHATBOT_SYNC_TOKEN")
    if not expected_token:
        return jsonify({"message": "Chatbot sync integration is not configured"}), 503

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"message": "Service authorization required"}), 401

    provided_token = auth_header.removeprefix("Bearer ").strip()
    if not hmac.compare_digest(provided_token, expected_token):
        return jsonify({"message": "Invalid service authorization"}), 401

    sites = get_latest_chatbot_site_snapshots()
    if sites is None:
        return jsonify({"message": "Tag data is temporarily unavailable"}), 503

    response = jsonify({
        "count": len(sites),
        "sites": sites,
    })
    response.headers["Cache-Control"] = "no-store"
    return response, 200


# ==============================================================================
# Per-Site Cron & Scheduler Tick
# ==============================================================================

def run_scheduler_tick():
    due_sites = get_due_sites()
    if not due_sites:
        return {"total_checked": 0, "updated": 0, "unchanged": 0, "errors": 0}

    print("--------------------------------------------------", flush=True)
    print(f"[PER-SITE CRON] Checking {len(due_sites)} due website(s)...", flush=True)

    updated = 0
    unchanged = 0
    errors = 0

    for site in due_sites:
        url = site['url']
        site_id = site['id']
        interval = site.get('cron_interval_hours')
        print(f"[CRON] Checking: {url} (Scheduled interval: {interval}h)", flush=True)
        scraped_data, error = scrape_website(url)
        if error:
            print(f"[ERROR] Scraping {url}: {error}", flush=True)
            record_site_scraped(site_id)
            errors += 1
            continue

        if check_if_data_changed(url, scraped_data):
            saved, save_msg = save_scrape_results(url, scraped_data, cron_interval_hours=interval)
            if saved:
                print(f"[UPDATED] Changes detected & saved for {url}", flush=True)
                updated += 1
            else:
                print(f"[WARNING] Failed to save changes for {url}: {save_msg}", flush=True)
                errors += 1
        else:
            print(f"[UNCHANGED] No changes detected for {url} (skipped save)", flush=True)
            record_site_scraped(site_id)
            unchanged += 1

    summary = f"Per-site cycle complete. Checked: {len(due_sites)}, Updated: {updated}, Unchanged: {unchanged}, Errors: {errors}"
    print(f"[PER-SITE CRON] {summary}", flush=True)
    print("--------------------------------------------------", flush=True)
    return {"total_checked": len(due_sites), "updated": updated, "unchanged": unchanged, "errors": errors}


scheduler = BackgroundScheduler()
# Check every 1 minute for any site whose next_scrape_at has arrived
scheduler.add_job(func=run_scheduler_tick, trigger="interval", minutes=1, id='site_tick_job')
scheduler.start()


@app.route('/api/cron/tick', methods=['POST', 'GET'])
@app.route('/api/cron/trigger', methods=['POST', 'GET'])
def trigger_cron():
    print("[CRON TICK] Triggering per-site scheduler tick...", flush=True)
    results = run_scheduler_tick()
    return jsonify({
        'message': f"Tick completed! Processed {results['total_checked']} due site(s) ({results['updated']} updated, {results['unchanged']} unchanged).",
        'results': results
    }), 200


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
