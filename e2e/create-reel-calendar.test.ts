import { test, expect } from '@playwright/test'

// QUARANTINED (2026-04-22) — these tests require an authenticated session and
// seeded data that CI doesn't yet provision. They've been red since before
// the Sprint-3 audit PRs and were masking real E2E regressions. Re-enable
// once auth + seed fixtures land (tracked: plan §E2E fixtures).
test.describe.skip('create-reel: add a reel to the calendar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contenido')
    await page.getByRole('button', { name: /cal\. reels/i }).click()
  })

  test('navigates to Cal. Reels section and shows the calendar header', async ({ page }) => {
    await expect(page.getByText('Calendario Reels')).toBeVisible()
  })

  test('opens add-item modal via + Añadir button and saves a new reel event', async ({ page }) => {
    await page.getByRole('button', { name: /añadir/i }).click()

    const blankOption = page.getByRole('button', { name: /en blanco|nuevo|sin plantilla/i })
    if (await blankOption.isVisible()) {
      await blankOption.click()
    }

    const titleInput = page.getByRole('textbox').first()
    await titleInput.fill('Reel E2E Test')

    await page.getByRole('button', { name: /guardar|crear|aceptar/i }).click()

    await expect(page.getByText('Reel E2E Test')).toBeVisible()
  })
})
