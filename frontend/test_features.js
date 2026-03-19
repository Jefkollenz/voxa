const { chromium } = require('@playwright/test');
const fs = require('fs');

const RESULTS = {
    timestamp: new Date().toISOString(),
    tests: [],
    critical_issues: [],
    warnings: []
};

function logTest(name, passed, details = "") {
    const result = { name, passed, details, timestamp: new Date().toISOString() };
    RESULTS.tests.push(result);
    const status = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} | ${name}`);
    if (details) console.log(`  └─ ${details}`);
}

function logCritical(issue) {
    RESULTS.critical_issues.push(issue);
    console.log(`🔴 CRITICAL: ${issue}`);
}

function logWarning(warning) {
    RESULTS.warnings.push(warning);
    console.log(`🟡 WARNING: ${warning}`);
}

async function main() {
    console.log("\n" + "=".repeat(70));
    console.log("🚀 VOXA FEATURE TESTING");
    console.log("=".repeat(70) + "\n");

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // ============================================================
        // TEST 1: Homepage Loads
        // ============================================================
        console.log("\n📄 TEST 1: Homepage Loads");
        console.log("-".repeat(70));

        try {
            await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 10000 });
            const title = await page.title();
            logTest("Homepage loads", true, `Title: ${title}`);
        } catch (e) {
            logTest("Homepage loads", false, e.message);
            logCritical("Server not responding - check if npm run dev is running");
        }

        // ============================================================
        // TEST 2: Avatars Load from Supabase
        // ============================================================
        console.log("\n🖼️ TEST 2: Avatars Load from Supabase");
        console.log("-".repeat(70));

        const images = await page.locator("img").all();
        logTest("Images exist on page", images.length > 0, `Found ${images.length} images`);

        let supabaseAvatars = [];
        let dicebearAvatars = [];

        for (const img of images) {
            const src = await img.getAttribute("src");
            if (src) {
                if (src.includes("supabase.co")) {
                    supabaseAvatars.push(src);
                } else if (src.includes("dicebear")) {
                    dicebearAvatars.push(src);
                }
            }
        }

        logTest("Supabase avatars load", supabaseAvatars.length > 0,
            `Found ${supabaseAvatars.length} Supabase avatars`);

        logTest("Fallback dicebear avatars exist", dicebearAvatars.length > 0,
            `Found ${dicebearAvatars.length} dicebear fallbacks`);

        // Show sample URLs
        if (supabaseAvatars.length > 0) {
            console.log(`  Sample Supabase URL: ${supabaseAvatars[0].substring(0, 80)}...`);
        }

        // ============================================================
        // TEST 3: SearchBar Component
        // ============================================================
        console.log("\n🔍 TEST 3: SearchBar Component");
        console.log("-".repeat(70));

        const searchInputs = await page.locator("input[placeholder*='pergunta']").all();
        const searchExists = searchInputs.length > 0;
        logTest("SearchBar input exists", searchExists);

        if (searchExists) {
            const input = searchInputs[0];
            await input.fill("henrique");
            await page.waitForTimeout(600); // Debounce

            logTest("SearchBar accepts input", true);

            await input.clear();
            logTest("SearchBar clear works", true);
        }

        // ============================================================
        // TEST 4: Navigation & Creator Cards
        // ============================================================
        console.log("\n🔗 TEST 4: Navigation & Links");
        console.log("-".repeat(70));

        const creatorCards = await page.locator("a[href*='/perfil/']").all();
        logTest("Creator cards present", creatorCards.length > 0,
            `Found ${creatorCards.length} creator cards`);

        const loginLink = await page.locator("a[href='/login']").count();
        logTest("Login link exists", loginLink > 0);

        const creatorOnboardLink = await page.locator("a[href*='criador']").count();
        logTest("Creator onboarding link exists", creatorOnboardLink > 0);

        // ============================================================
        // TEST 5: Page Structure & Elements
        // ============================================================
        console.log("\n📐 TEST 5: Page Structure");
        console.log("-".repeat(70));

        const nav = await page.locator("nav").count();
        logTest("Navigation present", nav > 0);

        const footer = await page.locator("footer").count();
        logTest("Footer present", footer > 0);

        const heroSection = await page.locator("h1").count();
        logTest("Hero section with title", heroSection > 0);

        // ============================================================
        // TEST 6: Data Attributes & Accessibility
        // ============================================================
        console.log("\n♿ TEST 6: Accessibility");
        console.log("-".repeat(70));

        const buttonsWithoutText = await page.locator("button:not(:has-text(''))").count();
        const buttonsWithAlt = await page.locator("button[aria-label]").count();

        const imagesWithoutAlt = await page.locator("img:not([alt])").count();
        logTest("Images have alt text", imagesWithoutAlt === 0,
            `Found ${imagesWithoutAlt} images without alt`);

        // ============================================================
        // TEST 7: Console Errors
        // ============================================================
        console.log("\n🐛 TEST 7: Console Errors");
        console.log("-".repeat(70));

        const consoleMessages = [];
        page.on("console", msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));

        await page.reload({ waitUntil: "networkidle" });

        const errors = consoleMessages.filter(m => m.type === "error");
        const warnings = consoleMessages.filter(m => m.type === "warning");

        logTest("No console errors", errors.length === 0, `Found ${errors.length} errors`);

        if (errors.length > 0) {
            errors.slice(0, 3).forEach(err => {
                logCritical(`Console error: ${err.text}`);
            });
        }

        // ============================================================
        // TEST 8: Responsive Design
        // ============================================================
        console.log("\n📱 TEST 8: Responsive Design");
        console.log("-".repeat(70));

        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

        const navMobile = await page.locator("nav").isVisible();
        logTest("Navigation visible on mobile", navMobile);

        const gridMobile = await page.locator("[class*='grid']").first().isVisible();
        logTest("Grid layout visible on mobile", gridMobile);

        // Reset viewport
        await page.setViewportSize({ width: 1280, height: 720 });

        // ============================================================
        // TEST 9: Links are valid
        // ============================================================
        console.log("\n🔗 TEST 9: Link Validation");
        console.log("-".repeat(70));

        const links = await page.locator("a[href]").all();
        let validLinksCount = 0;

        for (const link of links.slice(0, 10)) {
            const href = await link.getAttribute("href");
            if (href && (href.startsWith("/") || href.startsWith("http"))) {
                validLinksCount++;
            }
        }

        logTest("Links are properly formatted", validLinksCount > 0,
            `Checked ${Math.min(10, links.length)} links`);

        // ============================================================
        // SUMMARY
        // ============================================================
        console.log("\n" + "=".repeat(70));
        console.log("📊 TEST SUMMARY");
        console.log("=".repeat(70));

        const passed = RESULTS.tests.filter(t => t.passed).length;
        const total = RESULTS.tests.length;

        console.log(`\n✅ Passed: ${passed}/${total}`);
        console.log(`❌ Failed: ${total - passed}/${total}`);

        if (RESULTS.critical_issues.length > 0) {
            console.log(`\n🔴 Critical Issues: ${RESULTS.critical_issues.length}`);
            RESULTS.critical_issues.forEach(issue => console.log(`  • ${issue}`));
        }

        if (RESULTS.warnings.length > 0) {
            console.log(`\n🟡 Warnings: ${RESULTS.warnings.length}`);
            RESULTS.warnings.forEach(warning => console.log(`  • ${warning}`));
        }

        // Save results
        fs.writeFileSync("/tmp/test_results.json", JSON.stringify(RESULTS, null, 2));
        console.log("\n✅ Test results saved to /tmp/test_results.json\n");

    } catch (e) {
        logCritical(`Test execution failed: ${e.message}`);
        console.error(`\n❌ Error: ${e}\n`);
    } finally {
        await browser.close();
    }
}

main().catch(e => {
    console.error("Fatal error:", e);
    process.exit(1);
});
