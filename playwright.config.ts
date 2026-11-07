import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.ts',
  outputDir: 'e2e/.resultados',
  use: { baseURL: 'http://localhost:4173/trazo/', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173/trazo/', reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'tablet', use: { ...devices['Galaxy Tab S9'] ?? devices['iPad Pro 11'], browserName: 'chromium' } },
  ],
})
