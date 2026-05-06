import { test, expect } from '@playwright/test'

// QUARANTINED (2026-04-22) — `/contenido` requires auth; CI env has no
// session so `getByRole('button', { name: /copy ia/i })` never appears.
// Re-enable once auth fixture lands. See create-reel-calendar.test.ts note.
test.describe.skip('generar-copy: generate copy via AI', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/copy/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            'Copy de prueba E2E número 1',
            'Copy de prueba E2E número 2',
            'Copy de prueba E2E número 3',
          ],
        }),
      })
    })

    await page.goto('/contenido')
    await page.getByRole('button', { name: /copy ia/i }).click()
  })

  test('renders the copy generator heading and generate button', async ({ page }) => {
    await expect(page.getByText(/qué quieres crear hoy/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /generar/i })).toBeVisible()
  })

  test('shows generated results after clicking generate', async ({ page }) => {
    await page.getByRole('button', { name: /generar/i }).click()

    await expect(page.getByText('Copy de prueba E2E número 1')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Copy de prueba E2E número 2')).toBeVisible()
    await expect(page.getByText('Copy de prueba E2E número 3')).toBeVisible()
  })

  test('shows result count in the results section header', async ({ page }) => {
    await page.getByRole('button', { name: /generar/i }).click()

    await expect(page.getByText(/3 variantes/i)).toBeVisible({ timeout: 10_000 })
  })

  test('shows error state when API returns error status', async ({ page }) => {
    await page.unroute('**/api/copy/generate')
    await page.route('**/api/copy/generate', async (route) => {
      await route.fulfill({ status: 500, body: 'Internal Server Error' })
    })

    await page.getByRole('button', { name: /generar/i }).click()

    await expect(page.getByText(/error 500/i)).toBeVisible({ timeout: 10_000 })
  })
})
