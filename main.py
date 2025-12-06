from flask import Flask, request, send_file, jsonify
from weasyprint import HTML, CSS
import io
import requests
import base64
from urllib.parse import urljoin
from bs4 import BeautifulSoup

app = Flask(__name__)
MY_SECRET = "dtech-secret-2025"

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "status": "online",
        "service": "DTECH API Suite",
        "endpoints": [
            "/convert (PDF Generator)", 
            "/clone (Website Downloader)"
        ]
    })

# ==========================================
#  TOOL 1: PDF CONVERTER
# ==========================================
@app.route('/convert', methods=['GET'])
def convert():
    # 1. Security Check
    incoming_secret = request.headers.get('X-RapidAPI-Proxy-Secret')
    if incoming_secret != MY_SECRET:
        return jsonify({"error": "Unauthorized"}), 401

    # 2. Get Parameters
    target_url = request.args.get('url')
    if not target_url:
        return jsonify({"error": "Missing 'url' parameter"}), 400

    # Optional: Paper Format & Orientation
    paper_format = request.args.get('format', 'A4')
    orientation = request.args.get('orientation', 'portrait')
    theme = request.args.get('theme', 'light')
    
    # CSS to inject
    custom_css = CSS(string=f"@page {{ size: {paper_format} {orientation}; margin: 1cm; }}")
    extra_css = [custom_css]
    
    if theme == 'dark':
        dark_css = CSS(string="body { background-color: #121212 !important; color: #ffffff !important; }")
        extra_css.append(dark_css)

    try:
        # Generate PDF
        pdf_file = io.BytesIO()
        HTML(target_url).write_pdf(pdf_file, stylesheets=extra_css)
        pdf_file.seek(0)

        return send_file(
            pdf_file,
            mimetype='application/pdf',
            download_name='converted.pdf',
            as_attachment=True
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
#  TOOL 2: WEBSITE CLONER (NEW)
# ==========================================
@app.route('/clone', methods=['GET'])
def clone_site():
    # 1. Security Check
    incoming_secret = request.headers.get('X-RapidAPI-Proxy-Secret')
    if incoming_secret != MY_SECRET:
        return jsonify({"error": "Unauthorized"}), 401

    # 2. Get URL
    target_url = request.args.get('url')
    if not target_url:
        return jsonify({"error": "Missing 'url' parameter"}), 400
    
    # Auto-fix URL
    if not target_url.startswith('http'):
        target_url = 'https://' + target_url

    try:
        # 3. Fetch the Main HTML
        # Pretend to be a Windows Desktop to avoid blocks
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        session = requests.Session()
        response = session.get(target_url, headers=headers, timeout=15)
        
        # Parse HTML
        soup = BeautifulSoup(response.content, "html.parser")

        # --- Helper: Download Resource & Convert to Base64 ---
        def get_b64_content(url):
            try:
                # Resolve relative paths (e.g. "/style.css" -> "https://site.com/style.css")
                full_url = urljoin(target_url, url)
                res = session.get(full_url, headers=headers, timeout=10)
                if res.status_code == 200:
                    # Encode to base64
                    b64_data = base64.b64encode(res.content).decode('utf-8')
                    mime_type = res.headers.get('Content-Type', 'application/octet-stream')
                    return f"data:{mime_type};base64,{b64_data}"
            except:
                return None
            return None

        # --- STEP A: Inline CSS (Styles) ---
        for link in soup.find_all('link', rel='stylesheet'):
            if link.get('href'):
                full_url = urljoin(target_url, link['href'])
                try:
                    css_res = session.get(full_url, headers=headers, timeout=5)
                    if css_res.status_code == 200:
                        new_style = soup.new_tag('style')
                        new_style.string = css_res.text
                        link.replace_with(new_style)
                except: pass 

        # --- STEP B: Inline Images ---
        for img in soup.find_all('img'):
            if img.get('src'):
                if img['src'].startswith('data:'): continue
                
                b64_src = get_b64_content(img['src'])
                if b64_src:
                    img['src'] = b64_src
                    # Cleanup conflicting attributes
                    if img.has_attr('srcset'): del img['srcset']
                    if img.has_attr('loading'): del img['loading']

        # --- STEP C: Inline Scripts ---
        for script in soup.find_all('script'):
            if script.get('src'):
                full_url = urljoin(target_url, script['src'])
                try:
                    js_res = session.get(full_url, headers=headers, timeout=5)
                    if js_res.status_code == 200:
                        script.string = js_res.text
                        del script['src']
                except: pass

        # 4. Return the Bundled File
        file_stream = io.BytesIO(str(soup).encode('utf-8'))
        file_stream.seek(0)
        
        return send_file(
            file_stream,
            mimetype='text/html',
            download_name='cloned_page.html',
            as_attachment=True
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8081)
