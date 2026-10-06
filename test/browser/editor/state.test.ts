import {expect, test} from '@playwright/test'
import {assertEditorLineToEqual, delay} from '../utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
})

test('load state from db', async ({page}) => {
  await page.getByTestId('editor_scroll').waitFor()
  await page.getByTestId('navbar_menu_open').click()
  await assertEditorLineToEqual(page, 1, 'Start typing ...')

  await page.locator('.ProseMirror').pressSequentially('foo', {delay})

  await page.waitForTimeout(200)
  await page.reload()

  await page.getByTestId('editor_scroll').waitFor()
  await expect(page.locator('.ProseMirror p')).toHaveText('foo')
})

test('open file', async ({page}) => {
  await page.getByTestId('editor_scroll').waitFor()
  await page.getByTestId('navbar_menu_open').click()
  await expect(page.getByTestId('tree_link')).toHaveCount(1)
  await expect(page.getByTestId('tree_link')).toContainText('Untitled')

  await page.locator('.ProseMirror').pressSequentially('test1', {delay})
  await expect(page.getByTestId('tree_link')).toHaveCount(1)
  await expect(page.getByTestId('tree_link')).toContainText('test1')

  await page.getByTestId('new').click()
  await page.getByTestId('new_file').click()
  await expect(page.getByTestId('tree_link')).toHaveCount(2)
  await assertEditorLineToEqual(page, 1, 'Start typing ...')
  await page.locator('.ProseMirror').pressSequentially('test2', {delay})
  await expect(page.getByTestId('tree_link')).toHaveCount(2)
  await expect(page.getByTestId('tree_link').nth(1)).toContainText('test2')

  await page.getByTestId('new').click()
  await page.getByTestId('new_file').click()
  await expect(page.getByTestId('tree_link')).toHaveCount(3)
  await assertEditorLineToEqual(page, 1, 'Start typing ...')

  await expect(page.getByTestId('tree_link').nth(0)).toContainText('test1')
  await expect(page.getByTestId('tree_link').nth(1)).toContainText('test2')
  await expect(page.getByTestId('tree_link').nth(2)).toContainText('Untitled')
  await page.getByTestId('tree_link_title').nth(0).click()
  await page.waitForTimeout(100)
  await assertEditorLineToEqual(page, 1, 'test1')
  await expect(page.getByTestId('tree_link')).toHaveCount(3)

  // Unmodified files are currently not saved
  await page.reload()
  await assertEditorLineToEqual(page, 1, 'test1')
  await expect(page.getByTestId('tree_link')).toHaveCount(2)
})
