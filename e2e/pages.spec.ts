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
