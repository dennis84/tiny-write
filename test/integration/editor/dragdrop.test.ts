import {test} from '@playwright/test'
import {delay, lineTextEq} from '../utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('drag drop', async ({page}) => {
  await page.locator('.ProseMirror').pressSequentially('Line 1', {delay})
  await page.keyboard.press('Enter')
  await page.locator('.ProseMirror').pressSequentially('Line 2', {delay})
  await page.keyboard.press('Enter')
  await page.locator('.ProseMirror').pressSequentially('Line 3', {delay})
  await lineTextEq(page, 1, 'Line 1')
  await lineTextEq(page, 2, 'Line 2')
  await lineTextEq(page, 3, 'Line 3')

  const box = (await page.locator('.ProseMirror p:nth-of-type(1) .block-handle').boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 100, box.y + 500)
  await page.mouse.up()

  await lineTextEq(page, 1, 'Line 2')
  await lineTextEq(page, 2, 'Line 3')
  await lineTextEq(page, 3, 'Line 1')
})
