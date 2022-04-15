import { PlaywrightTestConfig } from '@playwright/test';
const config: PlaywrightTestConfig = {
  testDir: './test/integration',
  timeout: 10000,
  retries: 3,
  webServer: {
    command: 'npm run web',
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:3000/',
  },
};
export default config;
