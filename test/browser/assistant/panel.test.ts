import {expect, test} from '@playwright/test'
import type {PartialBlock} from '@/services/AiService'
import {createYUpdate} from '../../unit/testutil/codemirror-util'
import {assertCodeLineToEqual, delay, setupDB} from '../utils'
import {mockCopilotApiToken, mockCopilotModels} from './mock'

const blocks: PartialBlock[] = [
  {kind: 'text', content: '## Test1'},
  {kind: 'file', content: `const test1 = '111'`, lang: 'ts', path: 'src/main.ts'},
  {kind: 'text', content: '## Test2'},
  {kind: 'file', content: `const test2 = '222'`, lang: 'ts', ref: '222'},
  {kind: 'text', content: '## Test3'},
  {kind: 'file', content: `const test3 = '333'`, lang: 'ts', ref: '333', range: [5, 10]},
]

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
          {id: '2', parentId: '1', role: 'assistant', blocks},
        ],
      },
    ],
  })

  await mockCopilotApiToken(page)
  await mockCopilotModels(page)

  await page.goto('/')
  await page.getByTestId('initialized').waitFor()
})

test('copy', async ({page, context}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/assistant/1')

  await page.getByTestId('panel_button_copy').locator('nth=0').click()

  const content = await page.evaluate(() => navigator.clipboard.readText())
  expect(content).toBe("const test1 = '111'")
})

test('create file', async ({page}) => {
  await page.goto('/assistant/1')

  await page.getByTestId('panel_button_create').click()
  await assertCodeLineToEqual(page, 1, "const test1 = '111'")

  await page.getByTestId('navbar_menu_open').click()
  const treeLink = page.getByTestId('tree_link').filter({hasText: 'main.ts'})
  await expect(treeLink).toHaveCount(1)
  expect(await treeLink.getAttribute('level')).toBe('1')
  expect(await treeLink.getAttribute('data-parent-id')).toBe('1')
})

test('apply', async ({page}) => {
  await page.goto('/assistant/1')

  await page.getByTestId('panel_button_apply').nth(0).click()
  await page.locator('button[name="accept"]').click()

  await expect(page.getByText('All chunks applied')).toBeVisible()
  expect(page.url()).toContain('/code/222')

  await assertCodeLineToEqual(page, 1, "const test2 = '222'")
})

test('apply - all', async ({page}) => {
  await page.goto('/assistant/1')

  await page.getByTestId('panel_button_apply').nth(0).click()
  await page.getByTestId('accept_all').click()

  await expect(page.getByText('Full diff applied')).toBeVisible()
  expect(page.url()).toContain('/code/222')

  await assertCodeLineToEqual(page, 1, "const test2 = '222'")
})

test('apply - reject all', async ({page}) => {
  await page.goto('/assistant/1')

  await page.getByTestId('panel_button_apply').nth(0).click()
  await page.getByTestId('reject_all').click()

  await expect(page.getByText('Full diff rejected')).toBeVisible()
  expect(page.url()).toContain('/code/222')

  await assertCodeLineToEqual(page, 1, '')
})

test('apply - range', async ({page}) => {
  await page.goto('/code/333')
  await page.locator('.cm-content').pressSequentially('abcdefghijklmnop', {delay})

  await page.goto('/assistant/1')

  await page.getByTestId('panel_button_apply').nth(1).click()

  await page.locator('button[name="accept"]').click()

  await expect(page.getByText('All chunks applied')).toBeVisible()
  expect(page.url()).toContain('/code/333')

  await assertCodeLineToEqual(page, 1, "abcdeconst test3 = '333'klmnop")
})
