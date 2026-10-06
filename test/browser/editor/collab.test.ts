import {expect, test} from '@playwright/test'
import {assertEditorLineToEqual, delay} from '../utils'

test('create room', async ({page, browser}) => {
  await page.goto(`/`)
  await page.getByTestId('editor_scroll').waitFor()

  await page.getByTestId('navbar_menu_open').click()
  await page.getByTestId('collab').click()

  const id = page.url().split('/editor/')[1]

  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})

  const page2 = await browser.newPage()
  await page2.goto(`/editor?join=${id}`)
  await page2.getByTestId('join_editor').click()

  await assertEditorLineToEqual(page2, 1, 'Hello')

  await page.locator('.ProseMirror').pressSequentially(' World', {delay})

  await assertEditorLineToEqual(page, 1, 'Hello World')
  await assertEditorLineToEqual(page2, 1, 'Hello World')
})

test('create room - existing content file', async ({page, browser}) => {
  await page.goto('/')
  await page.getByTestId('editor_scroll').waitFor()

  const id = page.url().split('/editor/')[1]

  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})
  await page.getByTestId('navbar_menu_open').click()
  await page.getByTestId('collab').click()
  await assertEditorLineToEqual(page, 1, 'Hello')

  const page2 = await browser.newPage()
  await page2.goto(`/editor?join=${id}`)
  await page2.getByTestId('join_editor').click()

  await assertEditorLineToEqual(page2, 1, 'Hello')

  // make sure that cursor is at the start position
  await page2.locator('.ProseMirror').focus()
  await page2.keyboard.press(`Control+ArrowLeft`)

  await page2.locator('.ProseMirror').pressSequentially('World', {delay})

  await assertEditorLineToEqual(page2, 1, 'WorldHello')
  await assertEditorLineToEqual(page, 1, 'WorldHello')
})

test('sync config', async ({page, browser}) => {
  await page.goto('/')
  await page.getByTestId('editor_scroll').waitFor()
  await page.getByTestId('navbar_menu_open').click()

  // change font
  await page.getByTestId('appearance').click()
  await page.getByText('Scientifica').click()
  await expect(page.getByText('Scientifica').locator('..').locator('.icon')).toHaveCount(1) // checkbox icon
  await page.getByTestId('navbar_menu_back').click()

  // start collab
  await page.getByTestId('collab').click()
  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})

  // join room
  const id = page.url().split('/editor/')[1]
  const page2 = await browser.newPage()
  await page2.goto(`/editor?join=${id}`)
  await page2.getByTestId('join_editor').click()

  await assertEditorLineToEqual(page2, 1, 'Hello')
  await page2.getByTestId('navbar_menu_open').click()
  await page2.getByTestId('appearance').click()

  // config applied
  await expect(page2.getByText('Scientifica').locator('..').locator('.icon')).toHaveCount(1) // checkbox icon
})

test('rejoin room', async ({page}) => {
  await page.goto('/')
  await page.getByTestId('editor_scroll').waitFor()
  await page.getByTestId('navbar_menu_open').click()
  await page.getByTestId('collab').click()

  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})
  await expect(page.locator('.ProseMirror > *')).toHaveCount(1)

  await page.getByTestId('new').click()
  await page.getByTestId('new_file').click()
  await page.locator('.ProseMirror').pressSequentially('New', {delay})

  // open first file again and start collab
  await page.getByTestId('tree_link').nth(0).click()
  await page.getByTestId('collab').click()

  // "Hello" text should not be duplicated after clone, persist and reload the Y.Doc
  await expect(page.locator('.ProseMirror > *')).toHaveCount(1)
})

test('rejoin room - remote', async ({page, browser}) => {
  await page.goto('/')
  await page.getByTestId('editor_scroll').waitFor()
  await page.getByTestId('navbar_menu_open').click()
  await page.getByTestId('collab').click()

  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})
  await expect(page.locator('.ProseMirror > *')).toHaveCount(1)

  // join room
  const id = page.url().split('/editor/')[1]
  const page2 = await browser.newPage()
  await page2.goto(`/editor?join=${id}`)
  await page2.getByTestId('join_editor').click()

  await assertEditorLineToEqual(page2, 1, 'Hello')
  await expect(page2.locator('.ProseMirror > *')).toHaveCount(1)

  // stop collab
  await page2.getByTestId('navbar_menu_open').click()
  await page2.getByTestId('collab').click()
  await page.getByTestId('collab').click()

  // change whole text on client 1
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('Backspace')
  await page.locator('.ProseMirror').pressSequentially('123', {delay})
  await expect(page.locator('.ProseMirror > *')).toHaveCount(1)
  await assertEditorLineToEqual(page, 1, '123')

  // change whole text on client 2
  await page2.keyboard.press('ControlOrMeta+a')
  await page2.keyboard.press('Backspace')
  await page2.locator('.ProseMirror').pressSequentially('abc', {delay})

  // start collab again
  await page.getByTestId('collab').click()
  await page2.getByTestId('collab').click()

  const page3 = await browser.newPage({
    storageState: await page2.context().storageState({indexedDB: true}),
  })
  await page3.goto(`/editor?join=${id}`)
  await page3.getByTestId('join_editor').click()
  await expect(page3.locator('.ProseMirror > *')).toHaveCount(1)
  await assertEditorLineToEqual(page3, 1, /123abc|abc123/)

  await assertEditorLineToEqual(page, 1, /123abc|abc123/)
})
