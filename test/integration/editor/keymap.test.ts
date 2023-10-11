import os from 'os'
import {expect, test} from '@playwright/test'
import {delay} from '../utils'

const mod = os.platform() === 'darwin' ? 'Meta' : 'Control'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('on undo/redo', async ({page}) => {
  await page.locator('.ProseMirror').pressSequentially('text', {delay})
  await page.waitForTimeout(500)
  await page.locator('.ProseMirror').pressSequentially('123', {delay})

  await expect(page.locator('.ProseMirror')).toHaveText('text123')
  await page.keyboard.press(`${mod}+z`)
  await expect(page.locator('.ProseMirror')).toHaveText('text')
  await page.keyboard.press(`${mod}+y`)
  await expect(page.locator('.ProseMirror')).toHaveText('text123')
})

test('on new/discard', async ({page}) => {
  await page.locator('.ProseMirror').pressSequentially('first', {delay})
  await expect(page.locator('.ProseMirror')).toHaveText('first')

  await page.keyboard.press(`${mod}+n`)
  await expect(page.locator('.ProseMirror')).toHaveText('Start typing ...')

  await page.locator('.ProseMirror').pressSequentially('second', {delay})
  await expect(page.locator('.ProseMirror')).toHaveText('second')

  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="files"]')
  await expect(page.locator('[data-testid="file_list"] > div')).toHaveCount(2)

  // discard

  await page.keyboard.press(`${mod}+w`)
  await expect(page.locator('.ProseMirror')).toHaveText('Start typing ...')
  await expect(page.locator('[data-testid="file_list"] > div')).toHaveCount(2)

  await page.keyboard.press(`${mod}+w`)
  await page.waitForTimeout(100)
  await expect(page.locator('.ProseMirror')).toHaveText('first')
  await expect(page.locator('[data-testid="file_list"] > div')).toHaveCount(1)
})
