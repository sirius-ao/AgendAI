import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1312, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm --filter @agendai/website dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
