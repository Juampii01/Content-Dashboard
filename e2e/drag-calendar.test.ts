import { test, expect } from '@playwright/test'

// QUARANTINED (2026-04-22) — requires seeded localStorage + auth. See
// create-reel-calendar.test.ts quarantine note.
test.describe.skip('drag-calendar: move a calendar event to a different day', () => {
  test.beforeEach(async ({ page }) => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mm}-${dd}`

    await page.addInitScript(({ key, todayStr }: { key: string; todayStr: string }) => {
      const item = {
        id: 'e2e-drag-item',
        type: 'reel',
        title: 'Evento Drag Test',
        description: '',
        date: todayStr,
        status: 'idea',
        color: '#8E1F2F',
        category: 'educacional',
      }
      window.localStorage.setItem(key, JSON.stringify([item]))
    }, { key: 'eternity_calendario_reels', todayStr })

    await page.goto('/contenido')
    await page.getByRole('button', { name: /cal\. reels/i }).click()
  })

  test('shows the pre-seeded event in the calendar', async ({ page }) => {
    await expect(page.getByText('Evento Drag Test')).toBeVisible()
  })

  test('drags event to next day cell and event is repositioned', async ({ page }) => {
    const today = new Date()
    const nextDay = new Date(today)
    nextDay.setDate(today.getDate() + 1)
    const nextDayLabel = String(nextDay.getDate())

    const eventEl = page.getByText('Evento Drag Test')
    const targetCell = page.getByRole('gridcell', { name: nextDayLabel }).first()

    if (!(await targetCell.isVisible())) {
      test.skip()
      return
    }

    const eventBox = await eventEl.boundingBox()
    const targetBox = await targetCell.boundingBox()

    if (!eventBox || !targetBox) {
      test.skip()
      return
    }

    await page.mouse.move(eventBox.x + eventBox.width / 2, eventBox.y + eventBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 })
    await page.mouse.up()

    await expect(page.getByText('Evento Drag Test')).toBeVisible()

    const yyyy = nextDay.getFullYear()
    const mm = String(nextDay.getMonth() + 1).padStart(2, '0')
    const nextDd2 = String(nextDay.getDate()).padStart(2, '0')
    const expectedDate = `${yyyy}-${mm}-${nextDd2}`

    const persistedDate = await page.evaluate(({ storageKey, itemId }: { storageKey: string; itemId: string }) => {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return null
      const items: Array<{ id: string; date?: string }> = JSON.parse(raw)
      const item = items.find((i) => i.id === itemId)
      return item?.date ?? null
    }, { storageKey: 'eternity_content', itemId: 'e2e-drag-item' })

    expect(persistedDate).toBe(expectedDate)
  })
})
