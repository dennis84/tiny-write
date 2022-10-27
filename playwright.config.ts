import {PlaywrightTestConfig} from '@playwright/test'

const second = 1000
const config: PlaywrightTestConfig = {
  testDir: './test/integration',
  timeout: 10 * second,
  retries: process.env.CI ? 3 : 0,
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:3000/',
  },
}

export default config
