from flask import Flask, jsonify, request
from flask_cors import CORS
from db import get_db_connection, save_scrape_results
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

if __name__ == '__main__':
    app.run(port=5000, debug=True)
