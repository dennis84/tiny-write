import {expect, test} from '@playwright/test'
import {assertEditorLineToEqual, delay} from '../utils'

test('create room', async ({page, browser}) => {
  await page.goto(`/`)
  await page.waitForSelector('[data-testid="initialized"]')

  await page.click('[data-testid="floating_navbar_menu_open"]')
  await page.click('[data-testid="collab"]')

  const id = page.url().split('/editor/')[1]

  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})

  const page2 = await browser.newPage()
  await page2.goto(`/editor?join=${id}`)
  await page2.click('[data-testid="join_editor"]')

  await assertEditorLineToEqual(page2, 1, 'Hello')

  await page.locator('.ProseMirror').pressSequentially(' World', {delay})

  await assertEditorLineToEqual(page, 1, 'Hello World')
  await assertEditorLineToEqual(page2, 1, 'Hello World')
})

test('create room - existing content file', async ({page, browser}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')

  const id = page.url().split('/editor/')[1]

  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})
  await page.click('[data-testid="floating_navbar_menu_open"]')
  await page.click('[data-testid="collab"]')
  await assertEditorLineToEqual(page, 1, 'Hello')

  const page2 = await browser.newPage()
  await page2.goto(`/editor?join=${id}`)
  await page2.click('[data-testid="join_editor"]')

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
  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('[data-testid="floating_navbar_menu_open"]')

  // change font
  await page.click('[data-testid="appearance"]')
  await page.getByText('Scientifica').click()
  await expect(page.getByText('Scientifica')).toContainText('✅')
  await page.click('[data-testid="menu_navbar_back"]')

  // start collab
  await page.click('[data-testid="collab"]')
  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})

  // join room
  const id = page.url().split('/editor/')[1]
  const page2 = await browser.newPage()
  await page2.goto(`/editor?join=${id}`)
  await page2.click('[data-testid="join_editor"]')

  await assertEditorLineToEqual(page2, 1, 'Hello')
  await page2.click('[data-testid="floating_navbar_menu_open"]')
  await page2.click('[data-testid="appearance"]')

  // config applied
  await page.click('[data-testid="appearance"]')
  await expect(page.getByText('Scientifica')).toContainText('✅')
})

test('rejoin room', async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('[data-testid="floating_navbar_menu_open"]')
  await page.click('[data-testid="collab"]')

  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})
  await expect(page.locator('.ProseMirror > *')).toHaveCount(1)

  await page.click('[data-testid="new"]')
  await page.click('[data-testid="new_file"]')
  await page.locator('.ProseMirror').pressSequentially('New', {delay})

  // open first file again and start collab
  await page.locator('[data-testid="tree_link"]').nth(0).click()
  await page.click('[data-testid="collab"]')

  // "Hello" text should not be duplicated after clone, persist and reload the Y.Doc
  await expect(page.locator('.ProseMirror > *')).toHaveCount(1)
})

test('rejoin room - remote', async ({page, browser}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('[data-testid="floating_navbar_menu_open"]')
  await page.click('[data-testid="collab"]')

  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})
  await expect(page.locator('.ProseMirror > *')).toHaveCount(1)

  // join room
  const id = page.url().split('/editor/')[1]
  const page2 = await browser.newPage()
  await page2.goto(`/editor?join=${id}`)
  await page2.click('[data-testid="join_editor"]')

  await assertEditorLineToEqual(page2, 1, 'Hello')
  await expect(page2.locator('.ProseMirror > *')).toHaveCount(1)

  // stop collab
  await page2.click('[data-testid="floating_navbar_menu_open"]')
  await page2.click('[data-testid="collab"]')
  await page.click('[data-testid="collab"]')

  // change whole text on client 1
  await page.click('[data-testid="clear"]')
  await page.locator('.ProseMirror').pressSequentially('123', {delay})
  await expect(page.locator('.ProseMirror > *')).toHaveCount(1)
  await assertEditorLineToEqual(page, 1, '123')

  // change whole text on client 2
  await page2.click('[data-testid="clear"]')
  await page2.locator('.ProseMirror').pressSequentially('abc', {delay})

  // start collab again
  await page.click('[data-testid="collab"]')
  await page2.click('[data-testid="collab"]')

  const page3 = await browser.newPage({
    storageState: await page2.context().storageState({indexedDB: true}),
  })
  await page3.goto(`/editor?join=${id}`)
  await page3.click('[data-testid="join_editor"]')
  await expect(page3.locator('.ProseMirror > *')).toHaveCount(1)
  await assertEditorLineToEqual(page3, 1, '123abc')

  await assertEditorLineToEqual(page, 1, '123abc')
})
