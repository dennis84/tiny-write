import {expect, test} from '@playwright/test'
import {createYUpdate} from '../../unit/testutil/codemirror-util'
import {assertCodeLineToEqual, delay, setupDB} from '../utils'
import {mockCopilotApiToken, mockCopilotModels} from './mock'

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
      main: {
        provider: 'copilot',
        copilot: {user: 'johndoe', accessToken: 'AT-123'},
      },
    },
    files: [
      {id: '222', code: true, ydoc: createYUpdate('222', '')},
      {id: '333', code: true, ydoc: createYUpdate('333', '')},
    ],
    threads: [
      {
        id: '1',
        title: 'Test Thread',
        lastModified: new Date(),
        active: true,
        messages: [
          {id: '1', role: 'user', content: 'Blah'},
          {id: '2', parentId: '1', role: 'assistant', content},
        ],
      },
    ],
  })

  await mockCopilotApiToken(page)
  await mockCopilotModels(page)

  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('copy', async ({page, context}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/assistant/1')

  await page.locator('[data-testid="panel_button_copy"]').locator('nth=0').click()

  const content = await page.evaluate(() => navigator.clipboard.readText())
  expect(content).toBe("const test1 = '111'")
})

test('create file', async ({page}) => {
  await page.goto('/assistant/1')

  await page.locator('[data-testid="panel_button_create"]').click()
  await assertCodeLineToEqual(page, 1, "const test1 = '111'")

  await page.click('[data-testid="navbar_menu_open"]')
  const treeLink = page.locator('[data-testid="tree_link"]').filter({hasText: 'main.ts'})
  await expect(treeLink).toHaveCount(1)
  expect(await treeLink.getAttribute('level')).toBe('1')
  expect(await treeLink.getAttribute('data-parent-id')).toBe('1')
})

test('apply', async ({page}) => {
  await page.goto('/assistant/1')

  await page.locator('[data-testid="panel_button_apply"]').nth(0).click()
  await page.locator('button[name="accept"]').click()

  expect(page.getByText('All chunks applied')).toBeVisible()
  expect(page.url()).toContain('/code/222')

  await assertCodeLineToEqual(page, 1, "const test2 = '222'")
})

test('apply - all', async ({page}) => {
  await page.goto('/assistant/1')

  await page.locator('[data-testid="panel_button_apply"]').nth(0).click()
  await page.locator('[data-testid="accept_all"]').click()

  expect(page.getByText('Full diff applied')).toBeVisible()
  expect(page.url()).toContain('/code/222')

  await assertCodeLineToEqual(page, 1, "const test2 = '222'")
})

test('apply - reject all', async ({page}) => {
  await page.goto('/assistant/1')

  await page.locator('[data-testid="panel_button_apply"]').nth(0).click()
  await page.locator('[data-testid="reject_all"]').click()

  expect(page.getByText('Full diff rejected')).toBeVisible()
  expect(page.url()).toContain('/code/222')

  await assertCodeLineToEqual(page, 1, '')
})

test('apply - range', async ({page}) => {
  await page.goto('/code/333')
  await page.locator('.cm-content').pressSequentially('abcdefghijklmnop', {delay})

  await page.goto('/assistant/1')

  await page.locator('[data-testid="panel_button_apply"]').nth(1).click()

  await page.locator('button[name="accept"]').click()

  expect(page.getByText('All chunks applied')).toBeVisible()
  expect(page.url()).toContain('/code/333')

  await assertCodeLineToEqual(page, 1, "abcdeconst test3 = '333'klmnop")
})
