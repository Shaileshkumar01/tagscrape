from flask import Flask, jsonify, request
from flask_cors import CORS
from db import get_db_connection, save_scrape_results, get_scrape_history, get_scrape_details, get_all_users, create_new_user, delete_user_by_id, get_unique_sites, get_scrapes_for_site, delete_site_by_id, check_if_data_changed, update_user_password
from scraper import scrape_website
from auth import login_user
import json
import os
from apscheduler.schedulers.background import BackgroundScheduler 


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


@app.route('/api/scrape', methods=['POST'])
def scrape():
    request_data=request.get_json()
    url=request_data.get('url')
    if not url:
        return jsonify({'message':'URL is required'}), 400
    scraped_data, error = scrape_website(url)
    if error:
        return jsonify({'message':error}), 500
    has_changed = check_if_data_changed(url, scraped_data)
    if not has_changed:
        return jsonify({'message':'No changes detected. database skipped.','results':scraped_data,"unchanged": True }), 200
    saved, save_msg = save_scrape_results(url,scraped_data)
    if not saved:
        return jsonify({'message': save_msg}), 500

    return jsonify({'message':save_msg,'results':scraped_data}),200


@app.route('/api/login',methods=['POST'])
def login():
    request_data=request.get_json()
    email=request_data.get('email')
    password=request_data.get('password')
    
    if not email or not password:
        return jsonify({'mesage':'email and password are required'}),400
    token,error=login_user(email,password)
    if error:
        return jsonify({'message':error}),401
    return jsonify({'token':token}),200

@app.route('/api/history', methods=['GET'])
def history():
    data=get_scrape_history()
    return jsonify(data),200

@app.route('/api/scrape/<int:run_id>', methods=['GET'])
def get_past_scrape(run_id):
    data=get_scrape_details(run_id)
    if not data:
        return jsonify({'message':'Run not found'}), 404
    return jsonify(data), 200


@app.route('/api/users', methods=['GET'])
def get_users():
    users = get_all_users()
    return jsonify(users), 200

@app.route('/api/users', methods=['POST'])
def create_user():
   data = request.get_json()
   email=data.get('email')
   password=data.get('password')
   role_id=data.get('role_id', 3)
   
   if not email or not password:
        return jsonify({'message':'email and password are required'}), 400

   success, message= create_new_user(email, password, role_id)
   if success:
        return jsonify({'message':message}), 201
   else:
        return jsonify({'message':message}), 400


@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def remove_user(user_id):
    success, message = delete_user_by_id(user_id)
    if success:
        return jsonify({'message':message}), 200
    else:
        return jsonify({'message':message}), 400


@app.route('/api/sites', methods=['GET'])
def get_sites():
    return jsonify(get_unique_sites()), 200

@app.route('/api/sites/<int:website_id>/scrapes', methods=['GET'])
def get_site_scrapes(website_id):
    return jsonify(get_scrapes_for_site(website_id)), 200

@app.route('/api/sites/<int:website_id>', methods=['DELETE'])
def remove_site(website_id):
    success, message = delete_site_by_id(website_id)
    if success:
        return jsonify({'message': message}), 200
    else:
        return jsonify({'message': message}), 400



@app.route('/api/users/<int:user_id>/password', methods=['PUT'])
def update_password(user_id):
    data=request.get_json()
    new_password=data.get('password')
    if not new_password:
        return jsonify({'message':'new password is required'}), 400
    success, msg = update_user_password(user_id, new_password)
    if success:
        return jsonify({'message':msg}), 200
    return jsonify({'message':msg}), 400



CONFIG_FILE = 'config.json'

def get_interval():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f).get('interval_hours', 24)
    return 24

def scheduled_scraping():
    print("--------------------------------------------------", flush=True)
    print("⏰ [CRON JOB] Starting automated scrape cycle...", flush=True)
    sites = get_unique_sites()
    print(f"⏰ [CRON JOB] Found {len(sites)} website(s) to check.", flush=True)
    
    updated = 0
    unchanged = 0
    errors = 0

    for site in sites:
        url = site['url']
        print(f"⏰ Checking: {url}", flush=True)
        scraped_data, error = scrape_website(url)
        if error:
            print(f"❌ Error scraping {url}: {error}", flush=True)
            errors += 1
            continue

        if check_if_data_changed(url, scraped_data):
            saved, save_msg = save_scrape_results(url, scraped_data)
            if saved:
                print(f"✅ Changes detected & saved for {url}", flush=True)
                updated += 1
            else:
                print(f"⚠️ Failed to save changes for {url}: {save_msg}", flush=True)
                errors += 1
        else:
            print(f"ℹ️ No changes detected for {url} (skipped save)", flush=True)
            unchanged += 1

    summary = f"Scrape cycle complete. Checked: {len(sites)}, Updated: {updated}, Unchanged: {unchanged}, Errors: {errors}"
    print(f"🏁 [CRON JOB] {summary}", flush=True)
    print("--------------------------------------------------", flush=True)
    return {"updated": updated, "unchanged": unchanged, "errors": errors, "total": len(sites)}

scheduler = BackgroundScheduler()
scheduler.add_job(func=scheduled_scraping, trigger="interval", hours=get_interval(), id='scrape_job')
scheduler.start()

@app.route('/api/cron', methods=['GET'])
def get_cron():
    return jsonify({'interval_hours': get_interval()}), 200

@app.route('/api/cron', methods=['POST'])
def update_cron():
    data = request.get_json()
    hours = int(data.get('interval_hours', 24))
    
    with open(CONFIG_FILE, 'w') as f:
        json.dump({'interval_hours': hours}, f)
        
    scheduler.reschedule_job('scrape_job', trigger='interval', hours=hours)
    print(f"⏰ [CRON] Schedule updated to every {hours} hour(s) successfully.", flush=True)
    
    return jsonify({'message': f'Cron updated successfully! It will now auto-scrape every {hours} hours.'}), 200

@app.route('/api/cron/trigger', methods=['POST', 'GET'])
def trigger_cron():
    print("⚡ [MANUAL TRIGGER] Triggering scrape cycle on demand...", flush=True)
    results = scheduled_scraping()
    return jsonify({
        'message': f"Scraping completed! Checked {results['total']} sites ({results['updated']} updated, {results['unchanged']} unchanged).",
        'results': results
    }), 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)


