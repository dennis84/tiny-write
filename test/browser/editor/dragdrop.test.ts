import {test} from '@playwright/test'
import {delay, lineTextEq, openBlockMenu} from '../utils'

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

  await page.locator('.ProseMirror > p:nth-of-type(1)').hover()

  const handle = page.locator('#block-handle')
  const pm = page.locator('.ProseMirror')
  await handle.dragTo(pm, {
    targetPosition: {x: 100, y: 500},
  })

  await lineTextEq(page, 1, 'Line 2')
  await lineTextEq(page, 2, 'Line 3')
  await lineTextEq(page, 3, 'Line 1')
})

test('no sync error', async ({page}) => {
  await page.locator('.ProseMirror').pressSequentially('Line 1', {delay})

  for (let i = 0; i < 10; i++) {
    await openBlockMenu(page, 1)
  }

  await lineTextEq(page, 1, 'Line 1')
})
