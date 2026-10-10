// Main-thread time per interaction on a large page, from Chromium's CPU profiler.
// Run `pnpm build && pnpm preview` first, then `pnpm perf [rounds] [url]`. Each round adds every block once
// (5 rounds is about 800 layers). Numbers vary from run to run; compare runs on the same machine.
import { chromium } from '@playwright/test'

const rounds = Number(process.argv[2] ?? 5)
const url = process.argv[3] ?? 'http://localhost:4173'
const blocks = ['Navbar', 'Hero', 'Pricing', 'FAQ', 'Contact', 'Login', 'Dashboard', 'Footer']

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url)
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.getByRole('group', { name: 'Mode' }).getByRole('button', { name: 'Page' }).click()
await page.waitForSelector('[data-builder-id]')
for (let round = 0; round < rounds; round += 1) {
  for (const block of blocks) await page.locator(`button[aria-label="${block} block"]`).click()
}
await page.waitForTimeout(500)

const ids = await page.locator('[data-layer-id]').evaluateAll((rows) => rows.map((row) => row.dataset.layerId))
console.log(`${ids.length} layers`)
const row = (id) => page.locator(`[data-layer-id="${id}"] .layer-name`)
const cdp = await page.context().newCDPSession(page)
await cdp.send('Profiler.enable')
await cdp.send('Profiler.setSamplingInterval', { interval: 100 })

/**
 * Profiles `run` and prints the main thread's JavaScript and other (style, layout, paint) time per action.
 * `run` may return how many actions it really did.
 */
async function measure(label, planned, run) {
  await page.waitForTimeout(200)
  await cdp.send('Profiler.start')
  const done = await run()
  const actions = typeof done === 'number' ? done : planned
  await page.waitForTimeout(200)
  const { profile } = await cdp.send('Profiler.stop')
  const names = new Map(profile.nodes.map((node) => [node.id, node.callFrame.functionName]))
  let script = 0
  let other = 0
  profile.samples.forEach((id, index) => {
    const name = names.get(id)
    const micros = profile.timeDeltas[index] ?? 0
    if (name === '(idle)') return
    if (name === '(program)') other += micros
    else script += micros
  })
  const each = (micros) => `${(micros / 1000 / Math.max(actions, 1)).toFixed(1)}ms`.padStart(8)
  console.log(`${label.padEnd(22)} js ${each(script)}   style/layout/paint ${each(other)}   (${actions}x)`)
}

const picks = [5, 0.25, 0.5, 0.75, 0.95].map((at) => ids[at < 1 ? Math.floor(ids.length * at) : at])
await measure('select in Layers', picks.length, async () => {
  for (const id of picks) await row(id).click()
})

// Visible text and buttons spread over the page, clicked in the middle so nothing else is under the pointer.
const targets = await page.evaluate(() => {
  const visible = [...document.querySelectorAll('.canvas [data-builder-id]')].filter((layer) => {
    const box = layer.firstElementChild?.getBoundingClientRect()
    return /^(button|badge|heading|text)/.test(layer.dataset.builderId) && box && box.width > 0 && box.height > 0
  })
  return [0.1, 0.3, 0.5, 0.7, 0.9].map((at) => visible[Math.floor(visible.length * at)]?.dataset.builderId)
})
await measure('select on canvas', targets.length, async () => {
  let selected = 0
  for (const id of targets) {
    const point = await page.evaluate((target) => {
      const element = document.querySelector(`.canvas [data-builder-id="${target}"]`)?.firstElementChild
      element?.scrollIntoView({ block: 'center' })
      const box = element?.getBoundingClientRect()
      return box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null
    }, id)
    if (!point) continue
    await page.mouse.click(point.x, point.y)
    if ((await page.locator('.layer.current').getAttribute('data-layer-id')) === id) selected += 1
  }
  return selected
})

const textId = ids.find((id) => /^(heading|text)/.test(id)) ?? ids[3]
await row(textId).click()
const content = page.locator('.inspector [aria-label="Content"]')
await content.click()
await content.press('End')
await measure('keystroke', 12, () => content.pressSequentially(' performance', { delay: 20 }))

await measure('add a block', 1, () => page.locator('button[aria-label="Hero block"]').click())

await measure('undo', 3, async () => {
  await page.locator('.canvas').click({ position: { x: 5, y: 5 } })
  for (let step = 0; step < 3; step += 1) await page.keyboard.press('Control+z')
})

await measure('hover', 60, async () => {
  const canvas = await page.locator('.canvas').boundingBox()
  for (let step = 0; step < 60; step += 1) {
    await page.mouse.move(canvas.x + 200 + (step % 10) * 40, canvas.y + 100 + step * 10)
  }
})

await measure('drag (per move)', 80, async () => {
  const box = await page.locator('button[aria-label="Hero block"]').boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  for (let step = 0; step < 40; step += 1) {
    await page.mouse.move(box.x + 400 + step * 8, box.y + step * 14, { steps: 2 })
  }
  await page.keyboard.press('Escape')
  await page.mouse.up()
})

await browser.close()
