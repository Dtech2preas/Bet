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
        "title": "Dashboard & Metrics",
        "text": "Welcome to the D-TECH Management Portal. Right from your dashboard, you get an instant bird's-eye view of your entire business—real-time revenue, incoming cash flow, and active clients."
    },
    {
        "id": "scene2_settings",
        "title": "Business Settings & Banking",
        "text": "Setup takes less than two minutes. Enter your business details, company registration, and your Capitec, FNB, or Standard Bank account so you’re ready to bill."
    },
    {
        "id": "scene3_menu",
        "title": "Navigation Menu",
        "text": "All your business operations live right here in one clean navigation menu—from client directories to automated invoicing and accounting."
    },
    {
        "id": "scene4_clients",
        "title": "Clients Directory",
        "text": "Managing clients is effortless. Add new corporate clients with their registration, contact numbers, and billing details in seconds."
    },
    {
        "id": "scene5_invoices",
        "title": "Invoices & 4 PDF Styles",
        "text": "Ready to bill? Generate an invoice in under thirty seconds. It auto-calculates deposits and VAT, and gives you four executive PDF styles—Standard, Corporate, Creative, or the new Executive theme. Then share it straight to your client's WhatsApp with one tap."
    },
    {
        "id": "scene6_csv_upload",
        "title": "Bank CSV Reconciliation",
        "text": "Cash flow management is completely automated. We support multiple South African bank statement CSVs, including Capitec and FNB. Just drop in your statement—the system auto-categorizes your transactions, detects duplicates, and posts them straight to your ledger."
    },
    {
        "id": "scene7_financials_tax",
        "title": "SARS VAT201 & CIPC Tax Drawer",
        "text": "When tax season comes, open the Advanced Tax and Filing drawer. It calculates your SARS VAT 201 return, estimates your CIPC fee tier, and gives your accountant a clean one-click CSV export."
    },
    {
        "id": "scene8_cta",
        "title": "Wrap-up & CTA",
        "text": "Stop wasting your weekends on messy admin. Start for free today at management dot d-tech services dot co dot z-a."
    }
]

def get_audio_duration(file_path):
    """Measures precise duration of an audio file in seconds via ffprobe."""
    try:
        cmd = [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", file_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return float(res.stdout.strip())
    except Exception as e:
        print(f"  ! ffprobe duration query fallback: {e}")
        return 10.0

def generate_voiceovers(voice="en-ZA-LukeNeural"):
    """Generates speech clips using edge-tts at a measured, calm pace and returns durations."""
    os.makedirs("output_audio", exist_ok=True)
    os.makedirs("output_videos", exist_ok=True)

    print(f"\n[Voiceover] Generating speech using: {voice} (rate: -12%)...")
    durations = {}

    try:
        import edge_tts

        async def _synthesize():
            concat_files = []
            for seg in VOICEOVER_SEGMENTS:
                out_path = f"output_audio/{seg['id']}.mp3"
                # Calm, articulate pace (-12%) so voice never runs ahead of visuals
                communicate = edge_tts.Communicate(seg["text"], voice, rate="-12%")
                await communicate.save(out_path)
                dur = get_audio_duration(out_path)
                durations[seg["id"]] = dur
                concat_files.append(f"file '{os.path.abspath(out_path)}'")
                print(f"  ✓ Created: {out_path} ({dur:.2f}s)")

            concat_list = "output_audio/audio_concat.txt"
            with open(concat_list, "w") as f:
                f.write("\n".join(concat_files) + "\n")

            full_audio = "output_audio/full_voiceover.mp3"
            subprocess.run([
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", concat_list, "-c", "copy", full_audio
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            total_dur = get_audio_duration(full_audio)
            print(f"  ✓ Merged complete voiceover track: {full_audio} (Total: {total_dur:.2f}s)")
            return full_audio, durations

        return asyncio.run(_synthesize())
    except ImportError:
        print("  ! edge-tts not installed. Skipping audio generation.")
        return None, {seg["id"]: 10.0 for seg in VOICEOVER_SEGMENTS}
    except Exception as e:
        print(f"  ! Voiceover synthesis warning: {e}")
        return None, {seg["id"]: 10.0 for seg in VOICEOVER_SEGMENTS}

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
    except Exception:
        pass

def smooth_mouse_move(page, target_locator, steps=10):
    """Smoothly moves mouse to an element to drive the on-screen virtual cursor."""
    try:
        if target_locator.is_visible():
            box = target_locator.bounding_box()
            if box:
                tx = box["x"] + box["width"] / 2
                ty = box["y"] + box["height"] / 2
                page.mouse.move(tx, ty, steps=steps)
                time.sleep(0.1)
    except Exception:
        pass

def smooth_type(locator, text, delay=0.035):
    """Types text character-by-character for human realism."""
    try:
        locator.click()
        locator.fill("")
        for char in text:
            locator.press_sequentially(char)
            time.sleep(delay)
    except Exception:
        try:
            locator.fill(text)
        except Exception:
            pass

def hold_for_sync(start_time, target_duration):
    """Pads remaining scene time so scene transition locks exactly with spoken audio."""
    elapsed = time.time() - start_time
    remaining = target_duration - elapsed
    if remaining > 0:
        time.sleep(remaining)

def record_session(mode="desktop", scene_durations=None):
    """Executes the synchronized Playwright walkthrough against the static demo SPA."""
    if scene_durations is None:
        scene_durations = {}

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

        # Load Dedicated Static Demo SPA (Zero backend calls, zero network lag)
        page.goto("http://127.0.0.1:8080/demo/index.html", wait_until="domcontentloaded")
        time.sleep(1.0)

        # ---------------------------------------------------------
        # SCENE 1: Dashboard Overview & Live Terms Dismissal
        # ---------------------------------------------------------
        print("▶ [1/8] Dashboard: Viewing KPIs & dismissing Terms banner...")
        t0 = time.time()
        target_s1 = scene_durations.get("scene1_dashboard", 12.0)

        time.sleep(1.8) # View revenue and cash flow cards
        page.screenshot(path=f"screenshots/{prefix}_01_dashboard.png")

        # Scroll down slightly to view performance graph
        smooth_scroll(page, 0, 240, step=20, delay=0.03)
        time.sleep(1.2)

        # Move mouse to Accept Terms button and click live on screen
        try:
            accept_btn = page.locator("#acceptTermsBtn")
            if accept_btn.is_visible():
                smooth_mouse_move(page, accept_btn, steps=10)
                accept_btn.click()
                print("  ✓ Clicked 'Accept' on Terms & Conditions banner")
                time.sleep(1.0)
        except Exception as e:
            print(f"  ! Terms note: {e}")

        # Scroll back to top
        smooth_scroll(page, 240, 0, step=25, delay=0.03)
        hold_for_sync(t0, target_s1)

        # ---------------------------------------------------------
        # SCENE 2: Business Settings & Banking Details Setup
        # ---------------------------------------------------------
        print("▶ [2/8] Settings: Adding business name & Capitec banking details...")
        t0 = time.time()
        target_s2 = scene_durations.get("scene2_settings", 12.0)

        page.evaluate("switchTab('settings')")
        time.sleep(0.8)

        try:
            biz_input = page.locator("#settingsBusinessName")
            if biz_input.is_visible():
                smooth_mouse_move(page, biz_input, steps=8)
                smooth_type(biz_input, "Apex Innovations (Pty) Ltd", delay=0.025)

            # Scroll down to banking section
            smooth_scroll(page, 0, 320, step=25, delay=0.03)
            time.sleep(0.5)

            # Select Capitec
            bank_sel = page.locator("#settingsBank")
            if bank_sel.is_visible():
                smooth_mouse_move(page, bank_sel, steps=6)
                bank_sel.select_option("Capitec")
                time.sleep(0.4)

            # Account Number
            acc_num = page.locator("#settingsAccountNumber")
            if acc_num.is_visible():
                smooth_mouse_move(page, acc_num, steps=6)
                smooth_type(acc_num, "1056046651", delay=0.03)

            page.screenshot(path=f"screenshots/{prefix}_02_settings_banking.png")

            # Click Save Business Details
            save_btn = page.locator("button:has-text('Save Business Details')")
            if save_btn.is_visible():
                smooth_mouse_move(page, save_btn, steps=8)
                save_btn.click()
                time.sleep(1.0)
        except Exception as e:
            print(f"  ! Settings note: {e}")

        hold_for_sync(t0, target_s2)

        # ---------------------------------------------------------
        # SCENE 3: Navigation Menu Overview
        # ---------------------------------------------------------
        print("▶ [3/8] Navigation Menu: Overview of business tools...")
        t0 = time.time()
        target_s3 = scene_durations.get("scene3_menu", 8.0)

        try:
            menu_btn = page.locator("#menu-button")
            if menu_btn.is_visible():
                smooth_mouse_move(page, menu_btn, steps=8)
                menu_btn.click()
                time.sleep(1.2)
                page.screenshot(path=f"screenshots/{prefix}_03_menu_overview.png")

                # Hover over Clients and Invoices items inside the drawer
                cl_nav = page.locator("button.nav-item:has-text('Clients')").first
                if cl_nav.is_visible():
                    smooth_mouse_move(page, cl_nav, steps=8)
                    time.sleep(0.8)

                inv_nav = page.locator("button.nav-item:has-text('Invoices')").first
                if inv_nav.is_visible():
                    smooth_mouse_move(page, inv_nav, steps=6)
                    time.sleep(0.8)
        except Exception as e:
            print(f"  ! Menu note: {e}")

        hold_for_sync(t0, target_s3)

        # ---------------------------------------------------------
        # SCENE 4: Clients Directory & Add Client
        # ---------------------------------------------------------
        print("▶ [4/8] Clients: Adding new client with registration & contact...")
        t0 = time.time()
        target_s4 = scene_durations.get("scene4_clients", 10.0)

        page.evaluate("switchTab('clients')")
        time.sleep(1.0)
        page.screenshot(path=f"screenshots/{prefix}_04_clients_list.png")

        try:
            add_cl_btn = page.locator("button:has-text('Add Client')").first
            if add_cl_btn.is_visible():
                smooth_mouse_move(page, add_cl_btn, steps=8)
                add_cl_btn.click()
                time.sleep(0.8)

                # Fill client drawer details
                c_company = page.locator("#drawer-cl-company")
                if c_company.is_visible():
                    smooth_type(c_company, "Khumalo Logistics (Pty) Ltd", delay=0.02)

                c_contact = page.locator("#drawer-cl-contact")
                if c_contact.is_visible():
                    smooth_type(c_contact, "Sarah Jenkins", delay=0.02)

                c_email = page.locator("#drawer-cl-email")
                if c_email.is_visible():
                    smooth_type(c_email, "billing@khumalologistics.co.za", delay=0.015)

                page.screenshot(path=f"screenshots/{prefix}_05_add_client_drawer.png")

                # Click Save Client
                save_cl = page.locator("#saveClientBtn")
                if save_cl.is_visible():
                    smooth_mouse_move(page, save_cl, steps=6)
                    save_cl.click()
                    time.sleep(1.2)
        except Exception as e:
            print(f"  ! Client note: {e}")

        hold_for_sync(t0, target_s4)

        # ---------------------------------------------------------
        # SCENE 5: Invoices, 4 PDF Style Previews & WhatsApp
        # ---------------------------------------------------------
        print("▶ [5/8] Invoices: Creating invoice & previewing 4 PDF styles...")
        t0 = time.time()
        target_s5 = scene_durations.get("scene5_invoices", 18.0)

        page.evaluate("switchTab('invoices')")
        time.sleep(1.0)
        page.screenshot(path=f"screenshots/{prefix}_06_invoices_table.png")

        # 1. Open and save invoice
        try:
            create_inv_btn = page.locator("button:has-text('Create Invoice')").first
            if create_inv_btn.is_visible():
                smooth_mouse_move(page, create_inv_btn, steps=8)
                create_inv_btn.click()
                time.sleep(1.0)
                page.screenshot(path=f"screenshots/{prefix}_07_create_invoice_drawer.png")

                save_inv_btn = page.locator("#saveInvoiceBtn")
                if save_inv_btn.is_visible():
                    smooth_mouse_move(page, save_inv_btn, steps=6)
                    save_inv_btn.click()
                    time.sleep(1.2)
        except Exception as e:
            print(f"  ! Invoice drawer note: {e}")

        # 2. Cycle PDF template previews live on screen
        print("  → Previewing Corporate, Creative, and Executive PDF styles...")
        try:
            # Corporate Style
            page.evaluate("previewSelectedStyle('Corporate')")
            time.sleep(3.2)
            page.screenshot(path=f"screenshots/{prefix}_08_pdf_corporate.png")
            page.evaluate("closePdfPreview()")
            time.sleep(0.5)

            # Creative Style
            page.evaluate("previewSelectedStyle('Creative')")
            time.sleep(3.2)
            page.screenshot(path=f"screenshots/{prefix}_09_pdf_creative.png")
            page.evaluate("closePdfPreview()")
            time.sleep(0.5)

            # Executive Style
            page.evaluate("previewSelectedStyle('Executive')")
            time.sleep(3.8)
            page.screenshot(path=f"screenshots/{prefix}_10_pdf_executive.png")
            page.evaluate("closePdfPreview()")
            time.sleep(0.6)
        except Exception as e:
            print(f"  ! PDF preview note: {e}")

        # 3. Hover over WhatsApp button
        try:
            wa_btn = page.locator("button[title*='WhatsApp']").first
            if wa_btn.is_visible():
                smooth_mouse_move(page, wa_btn, steps=8)
                wa_btn.click() # Pops toast
                time.sleep(1.2)
        except Exception as e:
            pass

        hold_for_sync(t0, target_s5)

        # ---------------------------------------------------------
        # SCENE 6: Bank Statement CSV Upload & Auto-Reconcile
        # ---------------------------------------------------------
        print("▶ [6/8] Bank CSV Upload: Showing Capitec/FNB reconciliation...")
        t0 = time.time()
        target_s6 = scene_durations.get("scene6_csv_upload", 16.0)

        page.evaluate("switchTab('csv-upload')")
        time.sleep(1.0)
        page.screenshot(path=f"screenshots/{prefix}_11_csv_upload_dropzone.png")

        # Hover over dropzone showing bank badges
        try:
            dropzone = page.locator("#reconcile-empty-state")
            if dropzone.is_visible():
                smooth_mouse_move(page, dropzone, steps=10)
                time.sleep(1.5)
                # Click to simulate instant upload and parse
                dropzone.click()
                print("  ✓ Simulated Capitec statement parse")
                time.sleep(2.0)
                page.screenshot(path=f"screenshots/{prefix}_12_reconcile_parsed_view.png")

                # Hover and click Save to Ledger
                save_ledger = page.locator("#recon-top-save-btn")
                if save_ledger.is_visible():
                    smooth_mouse_move(page, save_ledger, steps=8)
                    save_ledger.click()
                    time.sleep(1.5)
        except Exception as e:
            print(f"  ! CSV reconcile note: {e}")

        hold_for_sync(t0, target_s6)

        # ---------------------------------------------------------
        # SCENE 7: Financials & Advanced Tax/Filing Drawer (SARS & CIPC)
        # ---------------------------------------------------------
        print("▶ [7/8] Financials: SARS VAT201 & CIPC Annual Return Drawer...")
        t0 = time.time()
        target_s7 = scene_durations.get("scene7_financials_tax", 15.0)

        page.evaluate("switchTab('financials')")
        time.sleep(1.2)
        page.screenshot(path=f"screenshots/{prefix}_13_financials_ledger.png")

        try:
            tax_btn = page.locator("button:has-text('Advanced Tax & Filing')").first
            if tax_btn.is_visible():
                smooth_mouse_move(page, tax_btn, steps=8)
                tax_btn.click()
                time.sleep(2.5) # Drawer slides out showing SARS VAT201 & CIPC Tier
                page.screenshot(path=f"screenshots/{prefix}_14_advanced_tax_drawer.png")

                # Hover 1-Click Accountant CSV Export button
                export_btn = page.locator("button:has-text('Accountant CSV Export')").first
                if export_btn.is_visible():
                    smooth_mouse_move(page, export_btn, steps=8)
                    export_btn.click()
                    time.sleep(1.5)
        except Exception as e:
            print(f"  ! Financials tax drawer note: {e}")

        hold_for_sync(t0, target_s7)

        # ---------------------------------------------------------
        # SCENE 8: Wrap-up & Call to Action
        # ---------------------------------------------------------
        print("▶ [8/8] Wrap-up: Returning to Dashboard & Final CTA...")
        t0 = time.time()
        target_s8 = scene_durations.get("scene8_cta", 9.0)

        page.evaluate("closeTaxDrawer()")
        page.evaluate("switchTab('dashboard')")
        time.sleep(1.2)
        smooth_scroll(page, 0, 300, step=20, delay=0.03)
        time.sleep(1.5)
        page.screenshot(path=f"screenshots/{prefix}_15_final_cta.png")

        hold_for_sync(t0, target_s8)

        print(f"✓ [{mode.upper()}] Walkthrough recording completed!")

        # Retrieve video path before context close
        video_path = page.video.path() if page.video else None
        page.close()
        context.close()
        browser.close()

    # Wait for Playwright to fully flush and finalize the WebM video to disk
    dest_raw = f"output_videos/{prefix}_raw.webm"
    print(f"  Waiting for video flush: {video_path}...")
    for _ in range(40):
        if video_path and os.path.exists(video_path) and os.path.getsize(video_path) > 15000:
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
        if os.path.getsize(largest) > 15000:
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
    os.makedirs("output_audio", exist_ok=True)
    os.makedirs("screenshots", exist_ok=True)

    # Launch single local HTTP server for the demo SPA
    repo_root = os.path.dirname(os.path.abspath(__file__))
    print("\n[Server] Starting local server bound to 127.0.0.1:8080...")
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", "8080", "--bind", "127.0.0.1"],
        cwd=repo_root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    # Wait until server is responding
    for _ in range(30):
        try:
            with urllib.request.urlopen("http://127.0.0.1:8080/demo/index.html", timeout=1) as resp:
                if resp.status == 200:
                    break
        except Exception:
            time.sleep(0.2)

    try:
        # 1. Synthesize Voiceover Track & measure exact scene durations
        audio_track, scene_durations = generate_voiceovers(voice=args.voice)

        # 2. Record Desktop Walkthrough (1280x720, 16:9)
        if args.viewports in ["both", "desktop"]:
            desktop_raw = record_session(mode="desktop", scene_durations=scene_durations)
            if desktop_raw:
                merge_video_audio(desktop_raw, audio_track, "output_videos/dtech_marketing_desktop.mp4")

        # 3. Record Mobile Walkthrough (390x844, 9:16)
        if args.viewports in ["both", "mobile"]:
            mobile_raw = record_session(mode="mobile", scene_durations=scene_durations)
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
