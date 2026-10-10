import { expect, test, type Page } from '@playwright/test'

const sidebarItem = (page: Page, name: string) =>
  page.getByRole('complementary', { name: 'Components' }).getByRole('button', { name, exact: true })
const layer = (page: Page, id: string) => page.locator(`[data-layer-id="${id}"]`)

async function openPage(page: Page, path = '/') {
  await page.goto(path)
  await page.getByRole('group', { name: 'Mode' }).getByRole('button', { name: 'Page' }).click()
}

test('keeps the page across a reload', async ({ page }) => {
  await openPage(page)
  await sidebarItem(page, 'Card').click()
  await expect(layer(page, 'card')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Pages: Untitled page' })).toBeVisible()
  await expect(layer(page, 'card')).toBeVisible()
})

test('opens a shared page as a new saved page and keeps the one in progress', async ({ page }) => {
  await openPage(page)
  await sidebarItem(page, 'Card').click()
  await expect(layer(page, 'card')).toBeVisible()

  const tree = {
    id: 'page',
    component: 'Stack',
    label: 'Page',
    children: [{ id: 'badge', component: 'Badge', label: 'Badge', text: 'Shared' }],
  }
  await page.goto(`/?component=button&mode=page&doc=${encodeURIComponent(JSON.stringify(tree))}`)
  await expect(page.getByRole('button', { name: 'Pages: Shared page' })).toBeVisible()
  await expect(layer(page, 'badge')).toBeVisible()
  // The link leaves the address bar, so a reload opens the saved copy instead of importing it again.
  expect(new URL(page.url()).search).toBe('')

  await page.reload()
  await expect(layer(page, 'badge')).toBeVisible()
  await page.getByRole('button', { name: 'Pages: Shared page' }).click()
  const saved = page.getByRole('list', { name: 'Saved pages' })
  await expect(saved.getByRole('listitem')).toHaveCount(2)
  await saved.getByRole('button', { name: /^Untitled page/ }).click()
  await expect(layer(page, 'card')).toBeVisible()
  await expect(layer(page, 'badge')).toHaveCount(0)
})

test('exports a page file and imports it back as a new page', async ({ page }) => {
  await openPage(page)
  await sidebarItem(page, 'Card').click()
  await expect(layer(page, 'card')).toBeVisible()

  await page.getByRole('button', { name: 'Pages: Untitled page' }).click()
  const exported = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).click()
  const download = await exported
  expect(download.suggestedFilename()).toBe('untitled-page.page.json')

  await page.getByLabel('Page file').setInputFiles(await download.path())
  await expect(page.getByRole('button', { name: 'Pages: Untitled page 2' })).toBeVisible()
  await expect(layer(page, 'card')).toBeVisible()
})

test('downloads the page as a component file named in its settings', async ({ page }) => {
  await openPage(page)
  await sidebarItem(page, 'Badge').click()
  await page.getByRole('button', { name: 'Pages: Untitled page' }).click()
  await page.getByText('Page settings').click()
  await page.getByRole('textbox', { name: 'Component name' }).fill('Landing')
  await page.getByRole('textbox', { name: 'Component name' }).press('Enter')
  await page.keyboard.press('Escape')

  await page.getByRole('tab', { name: 'Code' }).click()
  const saved = page.waitForEvent('download')
  await page.getByRole('region', { name: 'Generated code' }).getByRole('button', { name: 'Download' }).click()
  const download = await saved
  expect(download.suggestedFilename()).toBe('Landing.tsx')
  const stream = await download.createReadStream()
  let text = ''
  for await (const chunk of stream) text += chunk
  expect(text).toContain('export function Landing() {')
  expect(text).toContain('<Badge>Badge</Badge>')
})

test('two tabs keep each other’s pages and follow edits to the same page', async ({ page, context }) => {
  await openPage(page)
  await sidebarItem(page, 'Card').click()
  await expect(layer(page, 'card')).toBeVisible()

  const other = await context.newPage()
  await other.goto('/')
  await expect(layer(other, 'card')).toBeVisible()

  // An edit in one tab shows in the other, which has the same page open.
  await sidebarItem(page, 'Badge').click()
  await expect(layer(other, 'badge')).toBeVisible()

  // A page the other tab starts survives this tab's next save.
  await other.getByRole('button', { name: /^Pages: / }).click()
  await other.getByRole('button', { name: 'New page' }).click()
  await expect(other.getByRole('button', { name: 'Pages: Untitled page 2' })).toBeVisible()
  await sidebarItem(page, 'Button').click()
  await page.getByRole('button', { name: 'Pages: Untitled page' }).click()
  const saved = page.getByRole('list', { name: 'Saved pages' })
  await expect(saved.getByText('Untitled page 2')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: /^Pages: / }).click()
  await expect(page.getByRole('list', { name: 'Saved pages' }).getByRole('listitem')).toHaveCount(2)
})
