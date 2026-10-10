import { expect, test, type Page } from '@playwright/test'

/** The element a preview node draws (its selection wrapper has no box). */
const canvasNode = (page: Page, id: string) => page.locator(`[data-builder-id="${id}"] > *`).first()
const layer = (page: Page, id: string) => page.locator(`[data-layer-id="${id}"]`)
const toolbar = (page: Page, label: string) => page.getByRole('group', { name: `${label} toolbar` })

async function layerIds(page: Page): Promise<string[]> {
  return page
    .locator('[data-layer-id]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-layer-id') ?? ''))
}

async function openHero(page: Page) {
  await page.goto('/')
  await page.getByRole('group', { name: 'Mode' }).getByRole('button', { name: 'Page' }).click()
  await page.getByRole('button', { name: 'Hero block' }).click()
  await expect(canvasNode(page, 'text')).toBeVisible()
}

test('edits text in place: double-click or Enter, then Enter saves and Escape cancels', async ({ page }) => {
  await openHero(page)
  await canvasNode(page, 'text').dblclick()
  const editor = page.getByRole('textbox', { name: 'Edit Headline text' })
  await expect(editor).toBeFocused()
  await expect(editor).toHaveValue('Build pages in minutes')
  await editor.fill('Ship pages today')
  await editor.press('Enter')
  await expect(editor).toHaveCount(0)
  await expect(canvasNode(page, 'text')).toHaveText('Ship pages today')

  await page.keyboard.press('Enter')
  await expect(editor).toBeFocused()
  await editor.fill('Not kept')
  await editor.press('Escape')
  await expect(editor).toHaveCount(0)
  await expect(canvasNode(page, 'text')).toHaveText('Ship pages today')

  await page.keyboard.press('Control+z')
  await expect(canvasNode(page, 'text')).toHaveText('Build pages in minutes')
})

test('the selection toolbar and Alt+arrows move, select the parent, duplicate and remove', async ({ page }) => {
  await openHero(page)
  await canvasNode(page, 'button').click()
  const bar = toolbar(page, 'Primary action')
  await expect(bar.getByRole('button', { name: 'Move Primary action up' })).toBeDisabled()
  await bar.getByRole('button', { name: 'Move Primary action down' }).click()
  expect((await layerIds(page)).slice(-2)).toEqual(['button-2', 'button'])

  await page.keyboard.press('Alt+ArrowUp')
  expect((await layerIds(page)).slice(-2)).toEqual(['button', 'button-2'])

  await bar.getByRole('button', { name: 'Duplicate Primary action' }).click()
  await expect(layer(page, 'button-3')).toBeVisible()
  await toolbar(page, 'Primary action').getByRole('button', { name: 'Remove Primary action' }).click()
  await expect(layer(page, 'button-3')).toHaveCount(0)

  await canvasNode(page, 'button').click()
  await toolbar(page, 'Primary action').getByRole('button', { name: 'Select Actions' }).click()
  await expect(toolbar(page, 'Actions')).toBeVisible()
})

test('copies, cuts and pastes layers with the keyboard', async ({ page }) => {
  await openHero(page)
  await canvasNode(page, 'badge').click()
  await page.keyboard.press('Control+c')

  // A Button holds no Badge, so the copy goes right after the selected button.
  await canvasNode(page, 'button').click()
  await page.keyboard.press('Control+v')
  await expect(layer(page, 'badge-2')).toBeVisible()
  expect((await layerIds(page)).slice(-3)).toEqual(['button', 'badge-2', 'button-2'])

  await page.keyboard.press('Control+x')
  await expect(layer(page, 'badge-2')).toHaveCount(0)

  // The page holds anything, so a paste with the page selected goes inside it, at the end.
  await layer(page, 'page').getByRole('button', { name: 'Page', exact: true }).click()
  await page.keyboard.press('Control+v')
  expect((await layerIds(page)).at(-1)).toBe('badge-2')
})

test('Preview runs the page without selection, slots or layer shortcuts', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('group', { name: 'Mode' }).getByRole('button', { name: 'Page' }).click()
  await expect(page.locator('.empty-slot.root')).toBeVisible()
  await page.getByRole('tab', { name: 'Preview' }).click()
  await expect(page.locator('.empty-slot')).toHaveCount(0)

  await page.getByRole('tab', { name: 'Edit' }).click()
  await page.getByRole('button', { name: 'Hero block' }).click()
  await canvasNode(page, 'text').click()
  await expect(toolbar(page, 'Headline')).toBeVisible()

  await page.getByRole('tab', { name: 'Preview' }).click()
  await expect(page.locator('.outline')).toHaveCount(0)
  await canvasNode(page, 'button').click()
  await canvasNode(page, 'text').dblclick()
  await expect(page.getByRole('textbox', { name: 'Edit Headline text' })).toHaveCount(0)
  await page.keyboard.press('Delete')

  await page.getByRole('tab', { name: 'Edit' }).click()
  await expect(toolbar(page, 'Headline')).toBeVisible()
  await expect(layer(page, 'text')).toBeVisible()
})
