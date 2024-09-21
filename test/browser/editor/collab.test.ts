import {expect, test} from '@playwright/test'
import {delay, lineTextEq} from '../utils'
import {v4 as uuidv4} from 'uuid'

test('create room', async ({page, browser}) => {
  await page.goto('/')
  const url = page.url()
  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="collab"]')
  expect(url).not.toBe(page.url())
  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})

  const page2 = await browser.newPage()
  await page2.goto(page.url())
  await lineTextEq(page2, 1, 'Hello')
})

test('create room - existing content file', async ({page, browser}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})
  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="collab"]')
  await lineTextEq(page, 1, 'Hello')

  const page2 = await browser.newPage()
  await page2.goto(page.url())
  await lineTextEq(page2, 1, 'Hello')
})

test('existing room', async ({page, browser}) => {
  const room = uuidv4()
  await page.goto(`/editor/${room}?share=true`)
  await page.waitForSelector('[data-testid="initialized"]')
  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})

  const page2 = await browser.newPage()
  await page2.goto(`/editor/${room}?share=true`)
  await lineTextEq(page2, 1, 'Hello')

  // make sure that cursor is at the start position
  await page2.locator('.ProseMirror').focus()
  await page2.keyboard.press(`Control+ArrowLeft`)

  await page2.locator('.ProseMirror').pressSequentially('World', {delay})

  await lineTextEq(page2, 1, 'WorldHello')
  await lineTextEq(page, 1, 'WorldHello')
})

test('existing room - backup', async ({page}) => {
  const room = uuidv4()
  await page.goto('/')
  await page.locator('.ProseMirror').pressSequentially('123', {delay})

  await page.goto(`/editor/${room}?share=true`)
  await page.waitForSelector('[data-testid="initialized"]')
  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})
  await lineTextEq(page, 1, 'Hello')

  await page.click('[data-testid="burger"]')
  await expect(page.locator('[data-testid="tree_link"]')).toHaveCount(2)
  await expect(page.locator('[data-testid="tree_link"]').nth(0)).toContainText('123')
  await expect(page.locator('[data-testid="tree_link"]').nth(1)).toContainText('Hello')

  await page.locator('[data-testid="tree_link"]').nth(0).click()
  await lineTextEq(page, 1, '123')

  await expect(page.locator('[data-testid="tree_link"]')).toHaveCount(2)
})

test('sync config', async ({page, browser}) => {
  await page.goto('/')
  const url = page.url()
  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('[data-testid="burger"]')

  // change font
  await page.click('[data-testid="appearance"]')
  await page.getByText('Scientifica').click()
  await expect(page.getByText('Scientifica')).toContainText('✅')
  await page.click('[data-testid="back"]')

  // start collab
  await page.click('[data-testid="collab"]')
  expect(url).not.toBe(page.url())
  await page.locator('.ProseMirror').pressSequentially('Hello', {delay})

  // join room
  const page2 = await browser.newPage()
  await page2.goto(page.url())
  await lineTextEq(page2, 1, 'Hello')
  await page2.click('[data-testid="burger"]')
  await page2.click('[data-testid="appearance"]')

  // config applied
  await page.click('[data-testid="appearance"]')
  await expect(page.getByText('Scientifica')).toContainText('✅')
})

test('rejoin room', async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('[data-testid="burger"]')
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
