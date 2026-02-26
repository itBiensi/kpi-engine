import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:3000
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        
        # -> Click the 'First time? Click to seed admin user' button to seed the admin user, then fill the login form and sign in.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/form/div[1]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('admin@hris.com')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/form/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('admin123')
        
        # -> Click the 'Sign In' button to log in (click element index 8). After login, verify that a 'Theme toggle' control is visible and click it to confirm the UI shows a visible theme change.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the Theme toggle control (interactive element index 188) to switch the theme, then verify that the text 'Dark' (or another visible indication of dark mode) appears confirming the UI changed.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/aside/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        # Final assertions for theme toggle visibility and theme change indicator
        frame = context.pages[-1]
        # Verify the theme toggle control is visible
        assert await frame.locator('xpath=/html/body/div[2]/aside/div[3]/div/button[2]').is_visible(), 'Theme toggle (button[2]) should be visible on the dashboard'
        # Look for a visible "Dark" text anywhere in the known elements (report issue if not found)
        xpaths = [
            '/html/body/div[2]/aside/div[1]/div/div[1]',
            '/html/body/div[2]/aside/div[1]/div/div[1]/svg',
            '/html/body/div[2]/aside/nav/a[1]',
            '/html/body/div[2]/aside/nav/a[2]',
            '/html/body/div[2]/aside/nav/a[3]',
            '/html/body/div[2]/aside/nav/a[4]',
            '/html/body/div[2]/aside/nav/a[5]',
            '/html/body/div[2]/aside/nav/a[6]',
            '/html/body/div[2]/aside/nav/a[7]',
            '/html/body/div[2]/aside/nav/a[8]',
            '/html/body/div[2]/aside/div[3]/div/div[1]',
            '/html/body/div[2]/aside/div[3]/div/button[1]',
            '/html/body/div[2]/aside/div[3]/div/button[2]',
            '/html/body/div[2]/main/div/div[2]/div[1]',
            '/html/body/div[2]/main/div/div[2]/div[1]/div/div[1]/span',
            '/html/body/div[2]/main/div/div[2]/div[1]/div/div[2]',
            '/html/body/div[2]/main/div/div[2]/div[1]/div/div[2]/svg',
            '/html/body/div[2]/main/div/div[2]/div[2]',
            '/html/body/div[2]/main/div/div[2]/div[2]/div/div[1]/span',
            '/html/body/div[2]/main/div/div[2]/div[2]/div/div[2]',
            '/html/body/div[2]/main/div/div[2]/div[2]/div/div[2]/svg',
            '/html/body/div[2]/main/div/div[2]/div[3]',
            '/html/body/div[2]/main/div/div[2]/div[3]/div/div[1]/span',
            '/html/body/div[2]/main/div/div[2]/div[3]/div/div[2]',
            '/html/body/div[2]/main/div/div[3]',
            '/html/body/div[2]/main/div/div[3]/div/a[1]',
            '/html/body/div[2]/main/div/div[3]/div/a[2]',
            '/html/body/div[2]/main/div/div[3]/div/a[3]',
        ]
        found = False
        for xp in xpaths:
            try:
                txt = (await frame.locator(f"xpath={xp}").inner_text()).strip()
            except Exception:
                txt = ''
            if 'Dark' in txt:
                found = True
                break
        assert found, "Theme change indicator 'Dark' not found on the page after toggling theme. The visible 'Dark' label (or equivalent) appears to be missing — feature may not be present or the UI does not expose a 'Dark' text node."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    