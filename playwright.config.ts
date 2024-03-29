import {PlaywrightTestConfig} from '@playwright/test'

const second = 1000
const timeout = process.env.CI ? 10 * second : 10 * second

const config: PlaywrightTestConfig = {
  testDir: './test/integration',
  timeout,
  retries: process.env.CI ? 3 : 0,
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120 * second,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:3000/',
    viewport: {width: 600, height: 600},
    screenshot: 'only-on-failure',
  },
}

export default config
