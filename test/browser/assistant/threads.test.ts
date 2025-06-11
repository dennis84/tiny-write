import {expect, test} from '@playwright/test'
import {setupDB} from './mock'
import {delay} from '../utils'

test('threads', async ({page}) => {
  await setupDB(page, {
    ai: {
      main: {copilot: {user: 'johndoe', accessToken: 'AT-123'}},
    },
    threads: [
      {
        id: '1',
        title: 'Thread 1',
        lastModified: new Date(),
        messages: [{id: '1', role: 'user', content: 'Hello'}],
      },
      {
        id: '2',
        title: 'Thread 2',
        lastModified: new Date(),
        messages: [{id: '1', role: 'user', content: 'World'}],
      },
    ],
  })

  await page.goto('/')
  await page.click('[data-testid="floating_navbar_assistant_open"]')

  expect(page.getByText('Ask Copilot')).toBeVisible()

  await page.click('[data-testid="history"]')

  expect(page.getByText('Thread 1')).toBeVisible()
  await page.locator('[data-testid="thread_item"]').nth(0).click()

  expect(page.getByText('Hello')).toBeVisible()

  await page.locator('[data-testid="thread_item_menu"]').nth(0).click()
  await page.locator('[data-testid="thread_item_menu_rename"]').click()

  await page.locator('[data-testid="input_line"]').pressSequentially('test123', {delay})
  await page.keyboard.press('Enter')

  expect(page.locator('[data-testid="thread_item"]').nth(0).getByText('test123')).toBeVisible()

  await page.locator('[data-testid="thread_item_menu"]').nth(1).click()
  await page.locator('[data-testid="thread_item_menu_rename"]').click()

  await page.locator('[data-testid="input_line"]').pressSequentially('zzz', {delay})
  await page.keyboard.press('Enter')

  expect(page.locator('[data-testid="thread_item"]').nth(1).getByText('zzz')).toBeVisible()
})
