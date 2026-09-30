from flask import Flask, jsonify, request
from flask_cors import CORS
from db import get_db_connection, save_scrape_results, get_scrape_history, get_scrape_details, get_all_users, create_new_user, delete_user_by_id, get_unique_sites, get_scrapes_for_site, delete_site_by_id
from scraper import scrape_website
from auth import login_user



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
        return jsonify({'message': 'URL is required'}), 400
    scraped_data,error=scrape_website(url)
    if error:
        return jsonify({'message': error}), 500

    saved, save_msg=save_scrape_results(url,scraped_data)
    if not saved:
        return jsonify({'message': save_msg}), 500
    return jsonify(scraped_data), 200


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



if __name__ == '__main__':
    app.run(port=5000, debug=True)


