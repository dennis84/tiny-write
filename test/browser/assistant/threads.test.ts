import {expect, test} from '@playwright/test'
import {setupDB} from './mock'

test('threads', async ({page}) => {
  await setupDB(page, {
    ai: {
      main: {copilot: {user: 'johndoe', accessToken: 'AT-123'}},
    },
    threads: [
      {
        id: '1',
        title: 'Test Thread',
        lastModified: new Date(),
        messages: [{id: '1', role: 'user', content: 'Hello'}],
      },
    ],
  })

  await page.goto('/')
  await page.click('[data-testid="floating_navbar_assistant_open"]')

  expect(page.getByText('Ask Copilot')).toBeVisible()

  await page.click('[data-testid="history"]')

  expect(page.getByText('Test Thread')).toBeVisible()
  await page.click('[data-testid="thread_item"]')

  expect(page.getByText('Hello')).toBeVisible()
})
