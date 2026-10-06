import {expect, test} from '@playwright/test'
import {mockCopilotLogin, mockCopilotUser} from './mock'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.getByTestId('initialized').waitFor()
})

test('sign in', async ({page, context}) => {
  await mockCopilotLogin(page)

  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  await page.getByTestId('navbar_assistant_open').click()

  await expect(page.getByText('GitHub Copilot')).toBeVisible()

  await page.getByTestId('connect').click({position: {x: 10, y: 10}}) // Move away from tooltip

  await expect(page.getByText('USER-CODE-123')).toBeVisible()

  await page.getByTestId('copy_verification_uri').click()

  const content = await page.evaluate(() => navigator.clipboard.readText())

  expect(content).toBe('USER-CODE-123')

  await mockCopilotUser(page)

  await expect(page.getByText('Signed in with: johndoe')).toBeVisible()
})
