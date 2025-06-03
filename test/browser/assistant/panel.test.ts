import {expect, test} from '@playwright/test'
import {lineCodeEq, delay} from '../utils'
import {setupDB} from './mock'

const content = `
## Test1

\`\`\`ts file=src/main.ts
const test1 = '111'
\`\`\`

## Test2

\`\`\`ts id=222
const test2 = '222'
\`\`\`

## Test3

\`\`\`ts id=333 range=5-10
const test3 = '333'
\`\`\`
`

test.beforeEach(async ({page}) => {
  await setupDB(page, {
    ai: {
      main: {copilot: {user: 'johndoe', accessToken: 'AT-123'}},
    },
    threads: [
      {
        id: '1',
        title: 'Test Thread',
        lastModified: new Date(),
        active: true,
        messages: [
          {id: '1', role: 'user', content: 'Blah'},
          {id: '2', role: 'assistant', content},
        ],
      },
    ],
  })

  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('copy', async ({page, context}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  await page.click('[data-testid="floating_navbar_assistant_open"]')
  await page.click('[data-testid="history"]')
  await page.click('[data-testid="thread_item"]')
  await page.click('[data-testid="tooltip_backdrop"]')

  await page.locator('[data-testid="panel_button_copy"]').locator('nth=0').click()

  const content = await page.evaluate(() => navigator.clipboard.readText())
  expect(content).toBe("const test1 = '111'")
})

test('create file', async ({page}) => {
  await page.click('[data-testid="floating_navbar_assistant_open"]')
  await page.click('[data-testid="history"]')
  await page.click('[data-testid="thread_item"]')
  await page.click('[data-testid="tooltip_backdrop"]')

  await page.locator('[data-testid="panel_button_create"]').click()
  await lineCodeEq(page, 1, "const test1 = '111'")

  await page.click('[data-testid="floating_navbar_menu_open"]')
  await expect(page.locator('[data-testid="tree_link"]').locator('nth=1')).toContainText(
    'src/main.ts',
  )
})

test('apply', async ({page}) => {
  await page.goto(`/code/222`)

  await page.click('[data-testid="floating_navbar_assistant_open"]')
  await page.click('[data-testid="history"]')
  await page.click('[data-testid="thread_item"]')
  await page.click('[data-testid="tooltip_backdrop"]')

  await page.locator('[data-testid="panel_button_apply"]').click()
  await page.locator('button[name="accept"]').click()

  expect(page.getByText('All chunks applied')).toBeVisible()

  await lineCodeEq(page, 1, "const test2 = '222'")
})

test('apply - open file', async ({page}) => {
  await page.goto(`/code/222`)
  await page.waitForSelector('[data-testid="initialized"]')

  await page.goto(`/code/444`)
  await page.waitForSelector('[data-testid="initialized"]')

  await page.click('[data-testid="floating_navbar_assistant_open"]')
  await page.click('[data-testid="history"]')
  await page.click('[data-testid="thread_item"]')
  await page.click('[data-testid="tooltip_backdrop"]')

  await page.locator('[data-testid="panel_button_apply"]').click()
  await page.locator('button[name="accept"]').click()

  expect(page.getByText('All chunks applied')).toBeVisible()
  expect(page.url()).toContain('/code/222')

  await lineCodeEq(page, 1, "const test2 = '222'")
})

test('apply - range', async ({page}) => {
  await page.goto(`/code/333`)

  await page.locator('.cm-content').pressSequentially('abcdefghijklmnop', {delay})

  await page.click('[data-testid="floating_navbar_assistant_open"]')
  await page.click('[data-testid="history"]')
  await page.click('[data-testid="thread_item"]')
  await page.click('[data-testid="tooltip_backdrop"]')

  await page.locator('[data-testid="panel_button_apply"]').click()

  await page.locator('button[name="accept"]').click()

  expect(page.getByText('All chunks applied')).toBeVisible()

  await lineCodeEq(page, 1, "abcdeconst test3 = '333'klmnop")
})
