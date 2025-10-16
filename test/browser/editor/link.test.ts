import {test} from '@playwright/test'
import {assertEditorLineToEqual, move} from '../utils'

const delay = 50

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('create link', async ({page}) => {
  await page.locator('.ProseMirror').pressSequentially('foo [title](url) bar', {delay})
  await assertEditorLineToEqual(page, 1, 'foo title bar')
  await move(page, 'ArrowLeft', 4)
  await assertEditorLineToEqual(page, 1, 'foo title bar')
  await move(page, 'ArrowLeft')
  await assertEditorLineToEqual(page, 1, 'foo [title](url) bar')
  await move(page, 'ArrowRight', 6)
  await assertEditorLineToEqual(page, 1, 'foo [title](url) bar')
  await move(page, 'ArrowRight')
  await assertEditorLineToEqual(page, 1, 'foo title bar')
  await move(page, 'ArrowRight', 4)
  await page.locator('.ProseMirror').pressSequentially(' [other](link) ', {delay})
  await assertEditorLineToEqual(page, 1, 'foo title bar other ')
  await move(page, 'ArrowLeft', 2)
  await assertEditorLineToEqual(page, 1, 'foo title bar [other](link) ')
  await move(page, 'ArrowLeft', 11)
  await assertEditorLineToEqual(page, 1, 'foo [title](url) bar other ')
  await move(page, 'ArrowRight', 13)
  await assertEditorLineToEqual(page, 1, 'foo title bar [other](link) ')

  // new line
  await move(page, 'ArrowDown', 2)
  await page.keyboard.press('Enter')
  await page.locator('.ProseMirror').pressSequentially('test [another](path).', {delay})
  await move(page, 'ArrowLeft', 7)
  await move(page, 'ArrowUp')
  await move(page, 'ArrowLeft') // must move 1 to the side to expand
  await assertEditorLineToEqual(page, 1, 'foo [title](url) bar other ')
  await assertEditorLineToEqual(page, 2, 'test another.')

  // links in code
  await move(page, 'ArrowDown', 2)
  await page.keyboard.press('Enter')
  await page.locator('.ProseMirror').pressSequentially('test `inline code` ', {delay})
  await move(page, 'ArrowLeft', 5)
  await page.locator('.ProseMirror').pressSequentially('[foo](bar) ', {delay})
  await move(page, 'ArrowRight', 5)
  await page.locator('.ProseMirror').pressSequentially('123', {delay})
  await assertEditorLineToEqual(page, 3, 'test inline [foo](bar) code 123')
})
