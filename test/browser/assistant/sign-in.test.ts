import {test, expect} from '@playwright/test'
import {mockCopilotLogin, mockCopilotUser} from './mock'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('sign in', async ({page, context}) => {
  await mockCopilotLogin(page)

  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  await page.click('[data-testid="floating_navbar_assistant_open"]')

  expect(page.getByText('GitHub Copilot')).toBeVisible()

  await page.click('[data-testid="connect"]')

  await expect(page.getByText('USER-CODE-123')).toBeVisible()

  await page.click('[data-testid="copy_verification_uri"]')

  const content = await page.evaluate(() => navigator.clipboard.readText())

  expect(content).toBe('USER-CODE-123')

  await mockCopilotUser(page)

  await expect(page.getByText('Signed in with: johndoe')).toBeVisible()
})
