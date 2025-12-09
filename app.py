from flask import Flask, request, jsonify, send_from_directory
import os

app = Flask(__name__)

# CONFIG
STORAGE_FOLDER = '/var/www/sub/storage'
RAPID_API_SECRET = "dtech_super_secret_key_2025" 

# Ensure storage folder exists
os.makedirs(STORAGE_FOLDER, exist_ok=True)

# 1. HOME PAGE (To confirm system is online)
@app.route('/')
def home():
    return "<h1>D-TECH Storage Node Online</h1><p>Ready to serve.</p>"

# 2. FILE SERVING (Worker fetches from here)
@app.route('/storage/<subdomain>', methods=['GET'])
def get_content(subdomain):
    try:
        return send_from_directory(STORAGE_FOLDER, f"{subdomain}.html")
    except Exception as e:
        return "File not found", 404

# 3. FILE UPLOAD API (Worker sends HTML here)
@app.route('/api/create', methods=['POST'])
def create_site():
    secret = request.headers.get('X-DTECH-SECRET')
    if secret != RAPID_API_SECRET:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    subdomain = data.get('subdomain')
    html_content = data.get('html')

    try:
        with open(f"{STORAGE_FOLDER}/{subdomain}.html", "w") as f:
            f.write(html_content)
        return jsonify({"status": "success", "message": "File saved on VM."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=80)
