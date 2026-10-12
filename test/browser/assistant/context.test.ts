import {expect, test} from '@playwright/test'
import * as cmUtil from '../../unit/testutil/codemirror-util'
import * as pmUtil from '../../unit/testutil/prosemirror-util'
import {delay, setupDB} from '../utils'
import {mockCopilotApiToken, mockCopilotCompletion, mockCopilotModels} from './mock'

test.beforeEach(async ({page}) => {
  await setupDB(page, {
    ai: {
      main: {
        provider: 'copilot',
        copilot: {user: 'johndoe', accessToken: 'AT-123'},
      },
    },
    files: [
      {id: '1', code: true, ydoc: cmUtil.createYUpdate('1', '111')},
      {id: '2', ydoc: pmUtil.createYUpdate('2', ['222'])},
    ],
  })

  await mockCopilotApiToken(page)
  await mockCopilotModels(page)
  await mockCopilotCompletion(page, {chunks: ['A1'], text: 'First'})
})

test('add code to context', async ({page}) => {
  await page.goto('/code/1')
  await expect(page.getByText('111')).toBeVisible()
  await page.getByTestId('navbar_assistant_open').click()

  await page.getByTestId('chat_input').locator('.ProseMirror').pressSequentially('Q1', {delay})
  await page.getByTestId('send').click()

  // file attachment was added
  const question = page.getByTestId('question')
  expect(question).toContainText('Q1')
  await question.getByTestId('file_attachment_chip').click()
  const dialog = page.getByTestId('tooltip')
  expect(dialog).toContainText('111')

  // thread is added to code item in tree
  await page.getByTestId('navbar_menu_open').click()
  const treeLink = page.getByTestId('tree_link').filter({hasText: 'First'})
  expect(await treeLink.getAttribute('level')).toBe('1')
  expect(await treeLink.getAttribute('data-parent-id')).toBe('1')
})

test('new thread from markdown file', async ({page}) => {
  await page.goto('/editor/2')
  const editor = page.getByTestId('editor_scroll')
  await expect(editor.getByText('222')).toBeVisible()

  await page.getByTestId('navbar_menu_open').click()
  const treeLink = page.getByTestId('tree_link').filter({hasText: '222'})
  await treeLink.getByTestId('tree_link_menu').click()
  await page.getByTestId('new_thread').click()

  // markdown file was used as prompt
  const question = page.getByTestId('chat_input')
  expect(question).toContainText('222')

  // thread is added to markdown item in tree
  const threadTreeLink = page.getByTestId('tree_link').filter({hasText: 'Empty thread'})
  expect(await threadTreeLink.getAttribute('level')).toBe('1')
  expect(await threadTreeLink.getAttribute('data-parent-id')).toBe('2')
})
