import os
import sys
import time
import glob
import json
import asyncio
import argparse
import subprocess
import urllib.request
from playwright.sync_api import sync_playwright

VOICEOVER_SEGMENTS = [
    {
        "id": "scene1_dashboard",
        "text": "Welcome to the D-TECH Management Portal. Right from your dashboard, you get an instant bird's-eye view of your entire business—real-time revenue, incoming cash flow, and active clients.",
        "duration_min": 10.0
    },
    {
        "id": "scene2_settings",
        "text": "Setup takes less than two minutes. Enter your business details, brand colors, and your Capitec, FNB, or Standard Bank account so you’re ready to bill.",
        "duration_min": 10.5
    },
    {
        "id": "scene3_menu",
        "text": "All your business operations live right here in one clean menu—from client directories to automated invoicing and accounting.",
        "duration_min": 7.5
    },
    {
        "id": "scene4_clients",
        "text": "Managing clients is effortless. Add new clients with their registration, contact numbers, and billing details in seconds.",
        "duration_min": 9.5
    },
    {
        "id": "scene5_invoices",
        "text": "Ready to bill? Generate an invoice in under thirty seconds. It auto-calculates deposits and VAT, and gives you four executive PDF styles—Standard, Corporate, Creative, or the new Executive theme. Then share it straight to your client's WhatsApp with one tap.",
        "duration_min": 16.5
    },
    {
        "id": "scene6_csv_upload",
        "text": "Cash flow management is completely automated. We support multiple South African bank statement CSVs, including Capitec and FNB. Just drop in your statement—the system auto-categorizes your transactions, detects duplicates, and posts them straight to your ledger.",
        "duration_min": 14.5
    },
    {
        "id": "scene7_financials_tax",
        "text": "When tax season comes, open the Advanced Tax and Filing drawer. It calculates your SARS VAT 201 return, estimates your CIPC fee tier, and gives your accountant a clean one-click CSV export.",
        "duration_min": 13.5
    },
    {
        "id": "scene8_cta",
        "text": "Stop wasting your weekends on messy admin. Start for free today at management dot d-tech services dot co dot z-a.",
        "duration_min": 7.5
    }
]

def generate_voiceovers(voice="en-ZA-LukeNeural"):
    """Generates audio voiceover clips using edge-tts and merges into full_voiceover.mp3."""
    os.makedirs("output_audio", exist_ok=True)
    os.makedirs("output_videos", exist_ok=True)

    print(f"\n[Voiceover] Generating speech using: {voice}...")
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

            concat_list = "output_audio/audio_concat.txt"
            with open(concat_list, "w") as f:
                f.write("\n".join(concat_files) + "\n")

            full_audio = "output_audio/full_voiceover.mp3"
            subprocess.run([
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", concat_list, "-c", "copy", full_audio
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f"  ✓ Merged complete voiceover track: {full_audio}")
            return full_audio

        return asyncio.run(_synthesize())
    except ImportError:
        print("  ! edge-tts not installed. Skipping audio generation.")
        return None
    except Exception as e:
        print(f"  ! Voiceover synthesis warning: {e}")
        return None

def smooth_scroll(page, start_y, end_y, step=25, delay=0.03):
    """Simulates smooth human scrolling between two vertical coordinates."""
    current = start_y
    try:
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
    except Exception as e:
        pass

def setup_mock_api(page):
    """Sets up deterministic mock responses for all portal API endpoints."""
    mock_user = {
        "business_id": "biz_demo_01",
        "businessName": "Apex Innovations (Pty) Ltd",
        "email": "director@apexinnovations.co.za",
        "plan": "Premium"
    }

    # Inject mock session into localStorage for portal pages
    page.add_init_script(f"""
        localStorage.setItem('dtech_token', 'mock_token_demo_2026');
        localStorage.setItem('dtech_user', JSON.stringify({json.dumps(mock_user)}));
        localStorage.setItem('dtech_admin_pdf_template', 'Executive');
        // Do NOT set dtech_terms_consent so the user sees the terms banner and closes it live
    """)

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
        elif "/api/transactions" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps({
                "success": True,
                "transactions": [
                    {"id": "tx_1", "date": "2026-11-02", "description": "Client Payment - Khumalo Logistics", "category": "Sales & Services", "type": "Income", "amount": 21275, "vatApplicable": True},
                    {"id": "tx_2", "date": "2026-11-04", "description": "Cloud Hosting & Server Infra", "category": "Hosting & Software", "type": "Expense", "amount": 3450, "vatApplicable": True},
                    {"id": "tx_3", "date": "2026-11-06", "description": "Client Payment - Cape Horizon", "category": "Sales & Services", "type": "Income", "amount": 16100, "vatApplicable": True},
                    {"id": "tx_4", "date": "2026-11-08", "description": "Office Fiber Internet", "category": "Telecommunications", "type": "Expense", "amount": 999, "vatApplicable": True},
                    {"id": "tx_5", "date": "2026-11-09", "description": "Hardware & Workstation Setup", "category": "Equipment", "type": "Expense", "amount": 4200, "vatApplicable": True}
                ]
            }))
        else:
            route.continue_()

    page.route("**/api/**", handle_api)

def record_session(mode="desktop"):
    """Executes the synchronized, human-like Playwright walkthrough."""
    is_mobile = (mode == "mobile")
    viewport = {"width": 390, "height": 844} if is_mobile else {"width": 1280, "height": 720}
    prefix = "mobile" if is_mobile else "desktop"

    print(f"\n==========================================")
    print(f"🎬 Starting [{mode.upper()}] Walkthrough Recording")
    print(f"   Viewport: {viewport['width']}x{viewport['height']}")
    print(f"==========================================")

    raw_dir = f"output_videos/{prefix}_raw/"
    os.makedirs(raw_dir, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        )

        context = browser.new_context(
            viewport=viewport,
            is_mobile=is_mobile,
            has_touch=is_mobile,
            record_video_dir=raw_dir,
            record_video_size=viewport
        )
        page = context.new_page()
        page.set_default_timeout(15000)
        setup_mock_api(page)

        # ---------------------------------------------------------
        # SCENE 1: Dashboard Overview & Close Terms / Guides
        # ---------------------------------------------------------
        print("▶ [1/8] Dashboard: Viewing stats & closing Terms banner...")
        page.goto("http://127.0.0.1:8080/public_dashboard.html", wait_until="domcontentloaded")
        time.sleep(2.5) # Let user see revenue cards and charts
        page.screenshot(path=f"screenshots/{prefix}_01_dashboard.png")

        # Smooth scroll down to view cash flow
        smooth_scroll(page, 0, 300, step=20, delay=0.03)
        time.sleep(1.5)

        # Click Accept on the Terms & Conditions banner live on screen
        try:
            accept_terms = page.locator("#acceptTermsBtn, button:has-text('Accept')").first
            if accept_terms.is_visible():
                accept_terms.click(force=True)
                print("  ✓ Clicked 'Accept' on Terms & Conditions banner")
                time.sleep(1.5)
        except Exception as e:
            print(f"  ! Terms note: {e}")

        # Scroll back to top smoothly
        smooth_scroll(page, 300, 0, step=25, delay=0.03)
        time.sleep(1.5)

        # ---------------------------------------------------------
        # SCENE 2: Settings & Business Details Setup
        # ---------------------------------------------------------
        print("▶ [2/8] Settings: Adding business name & Capitec banking details...")
        page.goto("http://127.0.0.1:8080/public_settings.html", wait_until="domcontentloaded")
        time.sleep(2.0)

        try:
            # Type Business Name
            biz_name = page.locator("#settingsBusinessName")
            if biz_name.is_visible():
                biz_name.click()
                biz_name.fill("Apex Innovations (Pty) Ltd")
                time.sleep(0.8)

            # Scroll down to banking
            smooth_scroll(page, 0, 450, step=25, delay=0.03)
            time.sleep(1.0)

            # Select Bank
            bank_sel = page.locator("#settingsBank")
            if bank_sel.is_visible():
                bank_sel.select_option("Capitec")
                time.sleep(0.8)

            # Type Account Number
            acc_num = page.locator("#settingsAccountNumber")
            if acc_num.is_visible():
                acc_num.click()
                acc_num.fill("1056046651")
                time.sleep(0.8)

            page.screenshot(path=f"screenshots/{prefix}_02_settings_banking.png")
            time.sleep(1.5)
        except Exception as e:
            print(f"  ! Settings note: {e}")

        # ---------------------------------------------------------
        # SCENE 3: Side Menu Overview
        # ---------------------------------------------------------
        print("▶ [3/8] Navigation Menu: Overview of business tools...")
        try:
            menu_btn = page.locator("#menu-button, button:has(.fa-bars)").first
            if menu_btn.is_visible():
                menu_btn.click(force=True)
                time.sleep(2.5) # Let viewer absorb menu items
                page.screenshot(path=f"screenshots/{prefix}_03_menu_overview.png")
        except Exception as e:
            print(f"  ! Menu note: {e}")

        # ---------------------------------------------------------
        # SCENE 4: Clients & Adding New Client
        # ---------------------------------------------------------
        print("▶ [4/8] Clients: Adding new client with registration & contact...")
        page.goto("http://127.0.0.1:8080/public_clients.html", wait_until="domcontentloaded")
        time.sleep(2.0)
        page.screenshot(path=f"screenshots/{prefix}_04_clients_list.png")

        try:
            add_client_btn = page.locator("button:has-text('Add Client')").first
            if add_client_btn.is_visible():
                add_client_btn.click(force=True)
                time.sleep(1.5)

                # Type client details
                c_company = page.locator("#drawer-cl-company")
                if c_company.is_visible():
                    c_company.fill("Khumalo Logistics (Pty) Ltd")
                    time.sleep(0.6)

                c_contact = page.locator("#drawer-cl-contact")
                if c_contact.is_visible():
                    c_contact.fill("Sarah Jenkins")
                    time.sleep(0.6)

                c_email = page.locator("#drawer-cl-email")
                if c_email.is_visible():
                    c_email.fill("billing@khumalologistics.co.za")
                    time.sleep(0.6)

                page.screenshot(path=f"screenshots/{prefix}_05_add_client_modal.png")

                # Close client drawer
                close_btn = page.locator("button:has-text('Cancel'), #clientDrawerModal .fa-times").first
                if close_btn.is_visible():
                    close_btn.click(force=True)
                    time.sleep(1.0)
        except Exception as e:
            print(f"  ! Client note: {e}")

        # ---------------------------------------------------------
        # SCENE 5: Invoices, 4 PDF Style Previews & WhatsApp
        # ---------------------------------------------------------
        print("▶ [5/8] Invoices: Creating invoice & previewing 4 PDF styles...")
        page.goto("http://127.0.0.1:8080/public_invoices.html", wait_until="domcontentloaded")
        time.sleep(2.0)
        page.screenshot(path=f"screenshots/{prefix}_06_invoices_table.png")

        # Open Create Invoice
        try:
            create_inv_btn = page.locator("button:has-text('Create Invoice')").first
            if create_inv_btn.is_visible():
                create_inv_btn.click(force=True)
                time.sleep(2.0)
                page.screenshot(path=f"screenshots/{prefix}_07_create_invoice.png")

                # Close invoice modal
                close_inv = page.locator("#invoiceModal button:has-text('Cancel'), #invoiceModal .fa-times").first
                if close_inv.is_visible():
                    close_inv.click(force=True)
                    time.sleep(1.0)
        except Exception as e:
            print(f"  ! Invoice create note: {e}")

        # Preview PDF Styles: Corporate, Creative, and Executive
        print("  → Previewing PDF template styles live on screen...")
        try:
            # 1. Preview Corporate
            page.evaluate("if (typeof pdfEngine !== 'undefined') pdfEngine.previewSample('Corporate');")
            time.sleep(3.0)
            page.screenshot(path=f"screenshots/{prefix}_08_pdf_corporate.png")
            page.evaluate("if (typeof Swal !== 'undefined') Swal.close();")
            time.sleep(0.8)

            # 2. Preview Creative
            page.evaluate("if (typeof pdfEngine !== 'undefined') pdfEngine.previewSample('Creative');")
            time.sleep(3.0)
            page.screenshot(path=f"screenshots/{prefix}_09_pdf_creative.png")
            page.evaluate("if (typeof Swal !== 'undefined') Swal.close();")
            time.sleep(0.8)

            # 3. Preview Executive
            page.evaluate("if (typeof pdfEngine !== 'undefined') pdfEngine.previewSample('Executive');")
            time.sleep(3.5)
            page.screenshot(path=f"screenshots/{prefix}_10_pdf_executive.png")
            page.evaluate("if (typeof Swal !== 'undefined') Swal.close();")
            time.sleep(1.0)
        except Exception as e:
            print(f"  ! PDF preview note: {e}")

        # Hover over WhatsApp button
        try:
            wa_btn = page.locator("button[title*='WhatsApp'], button:has(.fa-whatsapp)").first
            if wa_btn.is_visible():
                wa_btn.hover()
                time.sleep(2.0)
        except Exception as e:
            pass

        # ---------------------------------------------------------
        # SCENE 6: Bank Statement CSV Upload & Auto-Reconcile
        # ---------------------------------------------------------
        print("▶ [6/8] Bank CSV Upload: Showing Capitec/FNB reconciliation...")
        page.goto("http://127.0.0.1:8080/public_csv-upload.html", wait_until="domcontentloaded")
        time.sleep(2.0)
        page.screenshot(path=f"screenshots/{prefix}_11_csv_upload_dropzone.png")

        # Simulate statement parsed and view populated
        try:
            page.evaluate("""
                const empty = document.getElementById('reconcile-empty-state');
                const split = document.getElementById('reconcile-split-view');
                if (empty) empty.classList.add('hidden');
                if (split) split.classList.remove('hidden');
            """)
            time.sleep(2.5)
            page.screenshot(path=f"screenshots/{prefix}_12_reconcile_parsed_view.png")

            # Click Save to Ledger
            save_ledger_btn = page.locator("#recon-top-save-btn, button:has-text('Save to Ledger')").first
            if save_ledger_btn.is_visible():
                save_ledger_btn.hover()
                time.sleep(1.5)
        except Exception as e:
            print(f"  ! CSV reconcile note: {e}")

        # ---------------------------------------------------------
        # SCENE 7: Financials & Advanced Tax/Filing Drawer (SARS & CIPC)
        # ---------------------------------------------------------
        print("▶ [7/8] Financials: SARS VAT201 & CIPC Annual Return Drawer...")
        page.goto("http://127.0.0.1:8080/public_financials.html", wait_until="domcontentloaded")
        time.sleep(2.0)
        page.screenshot(path=f"screenshots/{prefix}_13_financials_ledger.png")

        # Open Advanced Tax & Filing Drawer via JS
        try:
            page.evaluate("""
                if (typeof financialsManager !== 'undefined' && financialsManager.openAdvancedDrawer) {
                    financialsManager.openAdvancedDrawer();
                } else {
                    const b = document.querySelector('button[onclick*="openAdvancedDrawer"]');
                    if (b) b.click();
                }
            """)
            time.sleep(3.5) # Let drawer slide out cleanly
            page.screenshot(path=f"screenshots/{prefix}_14_advanced_tax_drawer.png")

            # Scroll smoothly inside drawer to show CIPC tier & VAT calculations
            smooth_scroll(page, 0, 300, step=20, delay=0.03)
            time.sleep(2.5)
        except Exception as e:
            print(f"  ! Financials tax drawer note: {e}")

        # ---------------------------------------------------------
        # SCENE 8: Wrap-up & Call to Action
        # ---------------------------------------------------------
        print("▶ [8/8] Wrap-up: Returning to Dashboard & Final CTA...")
        page.goto("http://127.0.0.1:8080/public_dashboard.html", wait_until="domcontentloaded")
        time.sleep(2.0)
        smooth_scroll(page, 0, 400, step=25, delay=0.03)
        time.sleep(3.5)
        page.screenshot(path=f"screenshots/{prefix}_15_final_cta.png")

        print(f"✓ [{mode.upper()}] Walkthrough recording completed!")
        
        # Capture video path string while Playwright event loop is active
        video_path = page.video.path() if page.video else None
        page.close()
        context.close()
        browser.close()

    # Wait for Playwright to fully flush and finalize the WebM video to disk
    dest_raw = f"output_videos/{prefix}_raw.webm"

    print(f"  Waiting for video flush: {video_path}...")
    for _ in range(40):
        if video_path and os.path.exists(video_path) and os.path.getsize(video_path) > 10000:
            break
        time.sleep(0.5)

    if video_path and os.path.exists(video_path):
        if os.path.exists(dest_raw):
            os.remove(dest_raw)
        os.rename(video_path, dest_raw)
        size_mb = os.path.getsize(dest_raw) / (1024 * 1024)
        print(f"✓ Saved raw {mode} video to: {dest_raw} ({size_mb:.2f} MB)")
        return dest_raw

    # Fallback search if path was different
    raw_files = glob.glob(f"{raw_dir}/*.webm")
    if raw_files:
        largest = max(raw_files, key=os.path.getsize)
        if os.path.getsize(largest) > 10000:
            if os.path.exists(dest_raw):
                os.remove(dest_raw)
            os.rename(largest, dest_raw)
            return dest_raw

    print(f"  ! Warning: Could not find raw video for {mode}")
    return None

def merge_video_audio(video_file, audio_file, output_mp4):
    """Merges video and synthesized voiceover with FFmpeg into crystal-clear MP4."""
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

    # Launch single local HTTP server for the entire walkthrough run
    print("\n[Server] Starting local server bound to 127.0.0.1:8080...")
    server = subprocess.Popen([sys.executable, "-m", "http.server", "8080", "--bind", "127.0.0.1"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    # Wait until server is definitely responding
    for _ in range(30):
        try:
            with urllib.request.urlopen("http://127.0.0.1:8080/public_dashboard.html", timeout=1) as resp:
                if resp.status == 200:
                    break
        except Exception:
            time.sleep(0.2)

    try:
        # 1. Synthesize Voiceover Track
        audio_track = generate_voiceovers(voice=args.voice)

        # 2. Record Desktop Walkthrough
        if args.viewports in ["both", "desktop"]:
            desktop_raw = record_session(mode="desktop")
            if desktop_raw:
                merge_video_audio(desktop_raw, audio_track, "output_videos/dtech_marketing_desktop.mp4")

        # 3. Record Mobile Walkthrough
        if args.viewports in ["both", "mobile"]:
            mobile_raw = record_session(mode="mobile")
            if mobile_raw:
                merge_video_audio(mobile_raw, audio_track, "output_videos/dtech_marketing_mobile.mp4")

    finally:
        server.terminate()
        print("[Server] Local HTTP server terminated cleanly.")

    print("\n🎉 Walkthrough video generation complete!")
    print("Files ready in output_videos/:")
    for f in glob.glob("output_videos/*.mp4"):
        print(f"  • {f} ({os.path.getsize(f) / (1024 * 1024):.2f} MB)")

if __name__ == "__main__":
    main()
