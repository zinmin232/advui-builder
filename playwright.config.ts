import { defineConfig, devices } from '@playwright/test'

/**
 * Browser tests for interactions jsdom cannot run, such as drag and drop. `pnpm e2e` starts its own dev server.
 * On CI it serves the production build instead (run `pnpm build` first): a cold dev server optimizes
 * dependencies on the first page load, which can outlast the test timeout.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `pnpm exec vite ${process.env.CI ? 'preview ' : ''}--port 5174 --strictPort`,
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
  },
})
