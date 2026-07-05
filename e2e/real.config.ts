import { defineConfig, devices } from '@playwright/test';

// Config dédiée aux tests E2E "réels" contre la PROD.
// Pas de projet setup, pas de storageState global : chaque spec gère sa propre auth réelle.
const BASE_URL = process.env.E2E_BASE_URL ?? 'https://lebonrebond.fr';

export default defineConfig({
  testDir: './real',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 150_000,
  use: {
    baseURL: BASE_URL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
