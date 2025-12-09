import requests

# HTML Content to Upload
full_html_code = """
<!DOCTYPE html>
<html lang="en">
<body style="background:black; color:white; text-align:center; padding:50px;">
    <h1>D-TECH PRO SITE</h1>
    <p>This site was deployed via API.</p>
</body>
</html>
"""

# API Config
url = "https://account-login.co.za/api/worker/manage"
headers = {
    "Content-Type": "application/json",
    "X-Auth": "dtech_super_secret_key_2025" 
}
payload = {
    "action": "SET",
    "subdomain": "prosite",
    "type": "HTML",
    "html": full_html_code
}

print("Uploading Site...")
response = requests.post(url, json=payload, headers=headers)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
