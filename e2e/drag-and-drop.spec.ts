import { expect, test, type Locator, type Page } from '@playwright/test'

/** Drags with real pointer events. `at` is where to release, as fractions of the target's box. */
async function drag(page: Page, source: Locator, target: Locator, at = { x: 0.5, y: 0.5 }) {
  await source.scrollIntoViewIfNeeded()
  await target.scrollIntoViewIfNeeded()
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('Drag source or target is not visible')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, { steps: 4 })
  await page.mouse.move(to.x + to.width * at.x, to.y + to.height * at.y, { steps: 20 })
  await page.mouse.up()
}

const sidebarItem = (page: Page, name: string) =>
  page.getByRole('complementary', { name: 'Components' }).getByRole('button', { name, exact: true })
const layer = (page: Page, id: string) => page.locator(`[data-layer-id="${id}"]`)
/** The element a preview node draws (its selection wrapper has no box). */
const canvasNode = (page: Page, id: string) => page.locator(`[data-builder-id="${id}"] > *`).first()

async function layerIds(page: Page): Promise<string[]> {
  return page
    .locator('[data-layer-id]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-layer-id') ?? ''))
}

async function code(page: Page): Promise<string> {
  await page.getByRole('tab', { name: 'Code' }).click()
  const text = await page.locator('.code-panel pre').innerText()
  await page.getByRole('tab', { name: 'Preview' }).click()
  return text
}

async function openPage(page: Page) {
  await page.goto('/')
  await page.getByRole('group', { name: 'Mode' }).getByRole('button', { name: 'Page' }).click()
  await expect(page.locator('.empty-slot.root')).toBeVisible()
}

test('builds a page by dragging components from the sidebar', async ({ page }) => {
  await openPage(page)
  await drag(page, sidebarItem(page, 'Card'), page.locator('.empty-slot.root'))
  await expect(layer(page, 'card')).toBeVisible()

  // The footer lays its children out in a row, so the left edge of the button means "before".
  await drag(page, sidebarItem(page, 'Badge'), canvasNode(page, 'button'), { x: 0.1, y: 0.5 })
  await expect(layer(page, 'badge')).toBeVisible()
  const output = await code(page)
  expect(output).toMatch(/<Card\.Footer>\s*<Badge>Badge<\/Badge>\s*<Button>Continue<\/Button>/)
  expect(output).toContain("from '@advui/core'")
})

test('moves the selected element with its canvas handle', async ({ page }) => {
  await openPage(page)
  await sidebarItem(page, 'Card').click()
  await canvasNode(page, 'button').click()
  await expect(page.getByRole('button', { name: 'Drag Button' })).toBeVisible()
  await drag(page, page.getByRole('button', { name: 'Drag Button' }), canvasNode(page, 'image'), { x: 0.5, y: 0.9 })
  const ids = await layerIds(page)
  expect(ids.indexOf('button')).toBe(ids.indexOf('image') + 1)
  expect(await code(page)).toMatch(/<Card\.Footer \/>/)
})

test('drops from the sidebar onto a layer row and reorders rows', async ({ page }) => {
  await openPage(page)
  await sidebarItem(page, 'Stack').click()
  await drag(page, sidebarItem(page, 'Badge'), layer(page, 'stack'))
  expect(await layerIds(page)).toEqual(['page', 'stack', 'text', 'button', 'badge'])

  await drag(page, layer(page, 'badge'), layer(page, 'text'), { x: 0.5, y: 0.1 })
  expect(await layerIds(page)).toEqual(['page', 'stack', 'badge', 'text', 'button'])

  await page.keyboard.press('Control+z')
  expect(await layerIds(page)).toEqual(['page', 'stack', 'text', 'button', 'badge'])
})

test('drops a column preset on the page and fills one of its columns', async ({ page }) => {
  await openPage(page)
  const preset = page.getByRole('complementary', { name: 'Components' }).getByRole('button', { name: 'Columns 8 4' })
  await drag(page, preset, page.locator('.empty-slot.root'))
  expect(await layerIds(page)).toEqual(['page', 'hstack', 'box', 'box-2'])
  const wide = await canvasNode(page, 'box').boundingBox()
  const narrow = await canvasNode(page, 'box-2').boundingBox()
  expect(Math.round(wide!.width / narrow!.width)).toBe(2)

  await drag(page, sidebarItem(page, 'Button'), canvasNode(page, 'box-2'))
  expect(await layerIds(page)).toEqual(['page', 'hstack', 'box', 'box-2', 'button'])
  expect(await code(page)).toMatch(/<Box flex=\{8\} \/>\s*<Box\s+flex=\{4\}\s*>\s*<Button>Click Me<\/Button>/)
})

test('refuses drops the component rules do not allow', async ({ page }) => {
  await page.goto('/')
  // Component mode shows a lone Button, which cannot hold children.
  await drag(page, sidebarItem(page, 'Badge'), canvasNode(page, 'button'))
  expect(await layerIds(page)).toEqual(['button'])

  await page.getByRole('group', { name: 'Mode' }).getByRole('button', { name: 'Page' }).click()
  await sidebarItem(page, 'Card').click()
  // Card.Title belongs in Card.Header; it cannot be dragged into Card.Content.
  await layer(page, 'card-title').click()
  await drag(page, page.getByRole('button', { name: 'Drag Title' }), canvasNode(page, 'image'), { x: 0.5, y: 0.9 })
  const ids = await layerIds(page)
  expect(ids.indexOf('card-title')).toBe(ids.indexOf('card-header') + 1)
})

test('keeps the page and the component when switching modes and reloading', async ({ page }) => {
  await openPage(page)
  await sidebarItem(page, 'Alert').click()
  await page.getByRole('group', { name: 'Mode' }).getByRole('button', { name: 'Component' }).click()
  expect(await layerIds(page)).toEqual(['button'])
  await page.getByRole('group', { name: 'Mode' }).getByRole('button', { name: 'Page' }).click()
  expect(await layerIds(page)).toEqual(['page', 'alert', 'alert-title', 'alert-description'])

  await page.reload()
  await expect(page.getByRole('group', { name: 'Mode' }).getByRole('button', { name: 'Page' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
