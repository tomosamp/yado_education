import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command:
      'node scripts/local-proxy.mjs & VITE_API_BASE_URL=http://localhost:8000 npm run dev -- --host localhost --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 120000,
  },
})
