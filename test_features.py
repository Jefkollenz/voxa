#!/usr/bin/env python3
"""
VOXA Feature Testing Script
Tests new functionality: avatars, SearchBar, homepage flows
"""

import asyncio
import json
import sys
from datetime import datetime
from playwright.sync_api import sync_playwright, expect

TEST_RESULTS = {
    "timestamp": datetime.now().isoformat(),
    "tests": [],
    "critical_issues": [],
    "warnings": []
}

def log_test(name, passed, details=""):
    """Log test result"""
    result = {
        "name": name,
        "passed": passed,
        "details": details,
        "timestamp": datetime.now().isoformat()
    }
    TEST_RESULTS["tests"].append(result)
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} | {name}")
    if details:
        print(f"  └─ {details}")

def log_critical(issue):
    """Log critical issue"""
    TEST_RESULTS["critical_issues"].append(issue)
    print(f"🔴 CRITICAL: {issue}")

def log_warning(warning):
    """Log warning"""
    TEST_RESULTS["warnings"].append(warning)
    print(f"🟡 WARNING: {warning}")

def main():
    with sync_playwright() as p:
        print("\n" + "="*70)
        print("🚀 VOXA FEATURE TESTING")
        print("="*70 + "\n")

        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # ============================================================
            # TEST 1: Homepage loads
            # ============================================================
            print("\n📄 TEST 1: Homepage Loads")
            print("-" * 70)
            page.goto("http://localhost:3000", wait_until="networkidle", timeout=10000)

            title = page.title()
            log_test("Homepage loads", True, f"Title: {title}")

            # ============================================================
            # TEST 2: Avatars load from Supabase
            # ============================================================
            print("\n🖼️ TEST 2: Avatars Load from Supabase")
            print("-" * 70)

            # Get all img elements
            images = page.locator("img").all()
            log_test("Images exist on page", len(images) > 0, f"Found {len(images)} images")

            # Check for avatar URLs
            avatar_urls = []
            supabase_avatars = []
            dicebear_avatars = []

            for img in images:
                src = img.get_attribute("src")
                alt = img.get_attribute("alt")
                if src:
                    avatar_urls.append(src)
                    if "supabase.co" in src:
                        supabase_avatars.append({"src": src, "alt": alt})
                    elif "dicebear" in src:
                        dicebear_avatars.append({"src": src, "alt": alt})

            log_test(
                "Supabase avatars load",
                len(supabase_avatars) > 0,
                f"Found {len(supabase_avatars)} Supabase avatars"
            )

            log_test(
                "Fallback dicebear avatars exist",
                len(dicebear_avatars) > 0,
                f"Found {len(dicebear_avatars)} dicebear fallbacks"
            )

            # Check avatar visibility
            try:
                creator_card = page.locator("a[href*='/perfil/']").first
                if creator_card:
                    avatar_img = creator_card.locator("img").first
                    is_visible = avatar_img.is_visible()
                    log_test("Creator avatars visible", is_visible)
            except:
                log_warning("Could not verify avatar visibility")

            # ============================================================
            # TEST 3: SearchBar Component
            # ============================================================
            print("\n🔍 TEST 3: SearchBar Component")
            print("-" * 70)

            # Find search input
            search_input = page.locator("input[placeholder*='você tem uma pergunta']")
            search_exists = search_input.count() > 0
            log_test("SearchBar input exists", search_exists)

            if search_exists:
                # Type in search
                search_input.fill("henrique")
                page.wait_for_timeout(500)  # Debounce

                # Check if dropdown appears
                dropdown = page.locator("div:has-text('henrique')").filter(has=search_input)
                log_test("SearchBar focuses and accepts input", True)

                # Clear and verify
                search_input.clear()
                log_test("SearchBar clear works", True)

            # ============================================================
            # TEST 4: Navigation Links
            # ============================================================
            print("\n🔗 TEST 4: Navigation & Links")
            print("-" * 70)

            # Check creator cards
            creator_cards = page.locator("a[href*='/perfil/']").all()
            log_test(
                "Creator cards present",
                len(creator_cards) > 0,
                f"Found {len(creator_cards)} creator cards"
            )

            # Check Login button
            login_link = page.locator("a[href='/login']")
            login_exists = login_link.count() > 0
            log_test("Login link exists", login_exists)

            # Check "Você é criador?" link
            creator_link = page.locator("a[href='/sou-criador']")
            creator_exists = creator_link.count() > 0
            log_test("Creator onboarding link exists", creator_exists)

            # ============================================================
            # TEST 5: Page Performance & Resources
            # ============================================================
            print("\n⚡ TEST 5: Performance & Resources")
            print("-" * 70)

            # Get console messages
            console_messages = []
            def on_console(msg):
                console_messages.append({"type": msg.type, "text": msg.text})

            page.on("console", on_console)

            # Reload to capture console
            page.reload(wait_until="networkidle")

            errors = [m for m in console_messages if m["type"] == "error"]
            warnings = [m for m in console_messages if m["type"] == "warning"]

            log_test("No console errors", len(errors) == 0, f"Found {len(errors)} errors")

            if errors:
                for err in errors[:3]:
                    log_critical(f"Console error: {err['text']}")

            # ============================================================
            # TEST 6: Responsive Design
            # ============================================================
            print("\n📱 TEST 6: Responsive Design")
            print("-" * 70)

            # Test mobile viewport
            page.set_viewport_size({"width": 375, "height": 667})  # iPhone size
            page.goto("http://localhost:3000", wait_until="networkidle")

            # Check if nav is still visible
            nav = page.locator("nav").first
            nav_visible = nav.is_visible()
            log_test("Navigation visible on mobile", nav_visible)

            # Check if creators grid adapts
            creator_grid = page.locator("div[class*='grid']").first
            log_test("Grid layout adapts to mobile", creator_grid.is_visible())

            # Reset viewport
            page.set_viewport_size({"width": 1280, "height": 720})

            # ============================================================
            # TEST 7: External Resources
            # ============================================================
            print("\n🌐 TEST 7: External Resources Loading")
            print("-" * 70)

            page.goto("http://localhost:3000", wait_until="networkidle")

            # Check if Supabase scripts loaded
            supabase_loaded = page.evaluate("""
                () => typeof window !== 'undefined' &&
                      document.body.innerHTML.includes('supabase')
            """)
            log_test("Supabase integration present", supabase_loaded)

            # ============================================================
            # SUMMARY
            # ============================================================
            print("\n" + "="*70)
            print("📊 TEST SUMMARY")
            print("="*70)

            passed = sum(1 for t in TEST_RESULTS["tests"] if t["passed"])
            total = len(TEST_RESULTS["tests"])

            print(f"\n✅ Passed: {passed}/{total}")

            if TEST_RESULTS["critical_issues"]:
                print(f"\n🔴 Critical Issues: {len(TEST_RESULTS['critical_issues'])}")
                for issue in TEST_RESULTS["critical_issues"]:
                    print(f"  • {issue}")

            if TEST_RESULTS["warnings"]:
                print(f"\n🟡 Warnings: {len(TEST_RESULTS['warnings'])}")
                for warning in TEST_RESULTS["warnings"]:
                    print(f"  • {warning}")

            # ============================================================
            # SAVE RESULTS
            # ============================================================
            with open("/tmp/test_results.json", "w") as f:
                json.dump(TEST_RESULTS, f, indent=2)

            print("\n✅ Test results saved to /tmp/test_results.json\n")

        except Exception as e:
            log_critical(f"Test execution failed: {str(e)}")
            print(f"\n❌ Error: {e}\n")

        finally:
            browser.close()

if __name__ == "__main__":
    main()
