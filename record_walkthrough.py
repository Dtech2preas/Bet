import os
import sys
import time
import glob
import json
import asyncio
import argparse
import subprocess
from playwright.sync_api import sync_playwright

VOICEOVER_SEGMENTS = [
    {
        "id": "scene1_hook",
        "text": "Running a business in South Africa is tough enough—your admin shouldn't make it harder. If you’re still building invoices in Word or stressing over bank reconciliations, check this out.",
        "duration_min": 9.5
    },
    {
        "id": "scene2_invoices",
        "text": "Meet the D-TECH Management Portal. In under thirty seconds, you can create a professional invoice, add automated fifty percent deposit terms or VAT, and send it straight to your client's WhatsApp with one tap.",
        "duration_min": 12.0
    },
    {
        "id": "scene3_pdf_templates",
        "text": "Choose between four executive design styles—Standard, Corporate, Creative, or the new Executive theme. Your clients receive a crisp, high-prestige PDF with your Capitec, FNB, or Standard Bank details front and center.",
        "duration_min": 13.0
    },
    {
        "id": "scene4_bank_csv",
        "text": "Bookkeeping headache? Just drop in your bank statement CSV. The system auto-categorizes your transactions, spots duplicates, and reconciles your cash flow automatically in real time.",
        "duration_min": 11.5
    },
    {
        "id": "scene5_tax_filing",
        "text": "Tax season coming? Click Advanced Tax and Filing. It calculates your SARS VAT 201 return, estimates your CIPC fee tier, and gives your accountant a clean one-click CSV export.",
        "duration_min": 12.0
    },
    {
        "id": "scene6_cta",
        "text": "Stop wasting your weekends on admin. Start for free today at management dot d-tech services dot co dot z-a.",
        "duration_min": 7.0
    }
]

def generate_voiceovers(voice="en-ZA-LukeNeural"):
    """Generates audio voiceover clips using edge-tts."""
    os.makedirs("output_audio", exist_ok=True)
    os.makedirs("output_videos", exist_ok=True)

    print(f"\n[Voiceover] Generating audio using voice: {voice}...")
    try:
        import edge_tts

        async def _synthesize():
            concat_files = []
            for seg in VOICEOVER_SEGMENTS:
                out_path = f"output_audio/{seg['id']}.mp3"
                communicate = edge_tts.Communicate(seg["text"], voice, rate="+2%")
                await communicate.save(out_path)
                concat_files.append(f"file '{os.path.abspath(out_path)}'")
                print(f"  ✓ Created: {out_path}")

            # Write concat list for ffmpeg
            concat_list = "output_audio/audio_concat.txt"
            with open(concat_list, "w") as f:
                f.write("\n".join(concat_files) + "\n")

            # Merge all segments into voiceover.mp3
            full_audio = "output_audio/full_voiceover.mp3"
            subprocess.run([
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", concat_list, "-c", "copy", full_audio
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f"  ✓ Merged complete voiceover: {full_audio}")
            return full_audio

        return asyncio.run(_synthesize())
    except ImportError:
        print("  ! edge-tts not installed. Skipping voiceover generation.")
        return None
    except Exception as e:
        print(f"  ! Voiceover error: {e}")
        return None

def smooth_scroll(page, start_y, end_y, step=35, delay=0.025):
    """Simulates smooth human scrolling between two coordinates."""
    current = start_y
    if start_y < end_y:
        while current < end_y:
            current = min(current + step, end_y)
            page.evaluate(f"window.scrollTo(0, {current})")
            time.sleep(delay)
    else:
        while current > end_y:
            current = max(current - step, end_y)
            page.evaluate(f"window.scrollTo(0, {current})")
            time.sleep(delay)

def setup_mock_api(page):
    """Sets up deterministic mock responses for all portal API endpoints."""
    # Pre-seed authenticated user in localStorage
    mock_user = {
        "business_id": "biz_demo_01",
        "businessName": "Apex Innovations (Pty) Ltd",
        "email": "director@apexinnovations.co.za",
        "plan": "Premium"
    }

    page.add_init_script(f"""
        localStorage.setItem('dtech_token', 'mock_token_demo_2026');
        localStorage.setItem('dtech_user', JSON.stringify({json.dumps(mock_user)}));
        localStorage.setItem('dtech_admin_pdf_template', 'Executive');
        localStorage.setItem('dtech_cookie_consent', 'accepted');
    """)

    # Mock API routes
    def handle_api(route):
        url = route.request.url
        
        if "/api/subscription" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps({
                "success": True,
                "subscription": {"plan": "Premium", "status": "active", "expires_at": "2027-01-01"}
            }))
        elif "/api/settings" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps({
                "success": True,
                "settings": {
                    "businessName": "Apex Innovations (Pty) Ltd",
                    "contactName": "David Khumalo",
                    "email": "billing@apexinnovations.co.za",
                    "phone": "083 456 7890",
                    "brandColor": "#2563eb",
                    "pdfTemplate": "Executive",
                    "bank": "Capitec Business",
                    "accountHolder": "Apex Innovations (Pty) Ltd",
                    "accountNumber": "1056046651",
                    "branchCode": "450105",
                    "userPlan": "Premium"
                }
            }))
        elif "/api/clients" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps({
                "success": True,
                "clients": [
                    {"id": "cl_1", "companyName": "Khumalo Logistics (Pty) Ltd", "contactPerson": "Sarah Jenkins", "email": "sarah@khumalologistics.co.za", "phone": "0821234567"},
                    {"id": "cl_2", "companyName": "Cape Horizon Media", "contactPerson": "Mark Van Der Merwe", "email": "mark@capehorizon.co.za", "phone": "0719876543"},
                    {"id": "cl_3", "companyName": "Zululand Engineering", "contactPerson": "Sipho Dlamini", "email": "sipho@zululand-eng.co.za", "phone": "0845558899"}
                ]
            }))
        elif "/api/invoices" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps({
                "success": True,
                "invoices": [
                    {
                        "id": "inv_1",
                        "clientId": "cl_1",
                        "reference": "INV-2026-042",
                        "date": "2026-11-10",
                        "dueDate": "2026-11-24",
                        "status": "Paid",
                        "paymentTerms": "50% Deposit",
                        "items": [
                            {"description": "Enterprise Cloud Architecture", "price": 12500, "quantity": 1},
                            {"description": "Automated Tax & SARS Module", "price": 6000, "quantity": 1}
                        ],
                        "subtotal": 18500,
                        "vatAmt": 2775,
                        "total": 21275
                    },
                    {
                        "id": "inv_2",
                        "clientId": "cl_2",
                        "reference": "INV-2026-043",
                        "date": "2026-11-11",
                        "dueDate": "2026-11-25",
                        "status": "Unpaid",
                        "paymentTerms": "50% Deposit",
                        "items": [
                            {"description": "Custom SaaS Portal Sprint 1", "price": 14000, "quantity": 1}
                        ],
                        "subtotal": 14000,
                        "vatAmt": 2100,
                        "total": 16100
                    }
                ]
            }))
        elif "/api/dashboard" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps({
                "success": True,
                "stats": {
                    "totalRevenue": 148500,
                    "outstandingInvoices": 16100,
                    "paidInvoicesCount": 18,
                    "activeClients": 14
                }
            }))
        else:
            route.continue_()

    page.route("**/api/**", handle_api)

def record_session(mode="desktop"):
    """Executes the synchronized Playwright walkthrough for Desktop or Mobile."""
    is_mobile = (mode == "mobile")
    viewport = {"width": 390, "height": 844} if is_mobile else {"width": 1280, "height": 720}
    prefix = "mobile" if is_mobile else "desktop"

    print(f"\n==========================================")
    print(f"🎬 Starting [{mode.upper()}] Walkthrough Recording")
    print(f"   Viewport: {viewport['width']}x{viewport['height']}")
    print(f"==========================================")

    # Launch local server bound to 127.0.0.1
    import urllib.request
    server = subprocess.Popen([sys.executable, "-m", "http.server", "8080", "--bind", "127.0.0.1"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    # Wait until local HTTP server is definitely up
    for _ in range(25):
        try:
            with urllib.request.urlopen("http://127.0.0.1:8080/index.html", timeout=1) as resp:
                if resp.status == 200:
                    break
        except Exception:
            time.sleep(0.2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
            )

            context = browser.new_context(
                viewport=viewport,
                is_mobile=is_mobile,
                has_touch=is_mobile,
                record_video_dir=f"output_videos/{prefix}_raw/",
                record_video_size=viewport
            )
            page = context.new_page()
            page.set_default_timeout(15000)
            setup_mock_api(page)

            # SCENE 1: Hook on Landing Page (index.html)
            print("▶ [1/6] Landing Page Hero & Features...")
            page.goto("http://127.0.0.1:8080/index.html", wait_until="domcontentloaded")
            time.sleep(2.0)
            page.screenshot(path=f"screenshots/{prefix}_01_landing_hero.png")

            smooth_scroll(page, 0, 750, step=30, delay=0.03)
            time.sleep(2.0)
            page.screenshot(path=f"screenshots/{prefix}_02_features.png")

            smooth_scroll(page, 750, 1500, step=35, delay=0.025)
            time.sleep(2.5)

            # SCENE 2: Invoices & 1-Click WhatsApp
            print("▶ [2/6] Invoices Management & 1-Click WhatsApp...")
            page.goto("http://127.0.0.1:8080/public_invoices.html", wait_until="domcontentloaded")
            time.sleep(2.0)
            page.screenshot(path=f"screenshots/{prefix}_03_invoices_table.png")

            # Click Create Invoice
            create_btn = page.locator("button:has-text('Create Invoice')")
            if create_btn.is_visible():
                create_btn.click()
                time.sleep(2.5)
                page.screenshot(path=f"screenshots/{prefix}_04_create_invoice_modal.png")
                # Close modal
                close_btn = page.locator("#invoiceModal button:has-text('Cancel'), #invoiceModal .fa-times")
                if close_btn.first.is_visible():
                    close_btn.first.click()
                    time.sleep(1.0)

            # Highlight WhatsApp button
            wa_btn = page.locator("button[title*='WhatsApp'], button:has(.fa-whatsapp)").first
            if wa_btn.is_visible():
                wa_btn.hover()
                time.sleep(2.5)

            # SCENE 3: 4 PDF Templates & Live Preview
            print("▶ [3/6] PDF Templates & Live Executive Preview...")
            page.goto("http://127.0.0.1:8080/public_settings.html", wait_until="domcontentloaded")
            time.sleep(1.5)

            # Scroll to PDF Template selector
            smooth_scroll(page, 0, 300, step=25, delay=0.03)
            time.sleep(1.5)

            # Select Executive template and click Preview
            tpl_select = page.locator("#settingsPdfTemplate")
            if tpl_select.is_visible():
                tpl_select.select_option("Executive")
                time.sleep(1.5)

            preview_btn = page.locator("button:has-text('Preview')").first
            if preview_btn.is_visible():
                preview_btn.click()
                time.sleep(3.5) # Let preview iframe render
                page.screenshot(path=f"screenshots/{prefix}_05_executive_pdf_preview.png")

                # Close preview if Swal is open
                swal_close = page.locator(".swal2-close")
                if swal_close.is_visible():
                    swal_close.click()
                    time.sleep(1.0)

            # SCENE 4: Bank Statement CSV Upload & Auto-Reconcile
            print("▶ [4/6] Bank Statement CSV Import & Reconciliation...")
            page.goto("http://127.0.0.1:8080/public_csv-upload.html", wait_until="domcontentloaded")
            time.sleep(2.0)
            page.screenshot(path=f"screenshots/{prefix}_06_csv_upload.png")

            smooth_scroll(page, 0, 400, step=25, delay=0.03)
            time.sleep(2.5)

            # SCENE 5: Financials & Advanced Tax/Filing Drawer
            print("▶ [5/6] Financials & Advanced Tax/Filing (SARS VAT201 & CIPC)...")
            page.goto("http://127.0.0.1:8080/public_financials.html", wait_until="domcontentloaded")
            time.sleep(2.0)

            # Open Advanced Tax & Filing Drawer
            drawer_btn = page.locator("#btn-advanced-drawer, button:has-text('Advanced Tax & Filing')")
            if drawer_btn.is_visible():
                drawer_btn.click()
                time.sleep(3.5) # Allow drawer slide animation
                page.screenshot(path=f"screenshots/{prefix}_07_sars_cipc_drawer.png")

                # Scroll inside drawer to show CIPC tier
                page.mouse.wheel(0, 300)
                time.sleep(2.0)

            # SCENE 6: Dashboard Revenue & CTA
            print("▶ [6/6] Dashboard Analytics & Call to Action...")
            page.goto("http://127.0.0.1:8080/public_dashboard.html", wait_until="domcontentloaded")
            time.sleep(2.0)
            page.screenshot(path=f"screenshots/{prefix}_08_dashboard_analytics.png")

            smooth_scroll(page, 0, 350, step=25, delay=0.03)
            time.sleep(3.0)

            print("✓ Walkthrough actions completed successfully!")
            context.close()
            browser.close()

    finally:
        server.terminate()

    # Find the recorded raw video
    raw_webms = glob.glob(f"output_videos/{prefix}_raw/*.webm")
    if raw_webms:
        raw_video = max(raw_webms, key=os.path.getctime)
        dest_raw = f"output_videos/{prefix}_raw.webm"
        if os.path.exists(dest_raw):
            os.remove(dest_raw)
        os.rename(raw_video, dest_raw)
        return dest_raw
    return None

def merge_video_audio(video_file, audio_file, output_mp4):
    """Merges video and synthesized voiceover with FFmpeg into high quality MP4."""
    print(f"\n[FFmpeg] Rendering final MP4: {output_mp4}...")
    if not os.path.exists(video_file):
        print(f"  ! Error: Video file not found: {video_file}")
        return False

    cmd = [
        "ffmpeg", "-y",
        "-i", video_file
    ]

    if audio_file and os.path.exists(audio_file):
        cmd.extend([
            "-i", audio_file,
            "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            output_mp4
        ])
    else:
        cmd.extend([
            "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p",
            output_mp4
        ])

    try:
        subprocess.run(cmd, check=True)
        size_mb = os.path.getsize(output_mp4) / (1024 * 1024)
        print(f"  ✓ Rendered successfully: {output_mp4} ({size_mb:.2f} MB)")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ! FFmpeg rendering failed: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Generate automated D-TECH marketing video walkthroughs.")
    parser.add_argument("--voice", default="en-ZA-LukeNeural", help="Voice model for voiceover (e.g. en-ZA-LukeNeural, en-ZA-LeahNeural)")
    parser.add_argument("--viewports", default="both", choices=["both", "desktop", "mobile"], help="Viewports to record")
    args = parser.parse_args()

    os.makedirs("output_videos", exist_ok=True)
    os.makedirs("screenshots", exist_ok=True)

    # 1. Generate Voiceover Track
    audio_track = generate_voiceovers(voice=args.voice)

    # 2. Record Desktop
    if args.viewports in ["both", "desktop"]:
        desktop_raw = record_session(mode="desktop")
        if desktop_raw:
            merge_video_audio(desktop_raw, audio_track, "output_videos/dtech_marketing_desktop.mp4")

    # 3. Record Mobile
    if args.viewports in ["both", "mobile"]:
        mobile_raw = record_session(mode="mobile")
        if mobile_raw:
            merge_video_audio(mobile_raw, audio_track, "output_videos/dtech_marketing_mobile.mp4")

    print("\n🎉 All marketing walkthrough videos generated successfully!")
    print("Files ready in output_videos/:")
    for f in glob.glob("output_videos/*.mp4"):
        print(f"  • {f} ({os.path.getsize(f) / (1024 * 1024):.2f} MB)")

if __name__ == "__main__":
    main()
