import os from 'os'
import {expect, test} from '@playwright/test'
import {delay} from './utils'

const mod = os.platform() === 'darwin' ? 'Meta' : 'Control'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('on undo/redo', async ({page}) => {
  await page.type('.ProseMirror', 'text', {delay})
  await page.waitForTimeout(500)
  await page.type('.ProseMirror', '123', {delay})

  expect(await page.textContent('.ProseMirror')).toBe('text123')
  await page.keyboard.press(`${mod}+z`)
  expect(await page.textContent('.ProseMirror')).toBe('text')
  await page.keyboard.press(`${mod}+y`)
  expect(await page.textContent('.ProseMirror')).toBe('text123')
})

test('on new/discard', async ({page}) => {
  await page.type('.ProseMirror', 'first', {delay})
  expect(await page.textContent('.ProseMirror')).toBe('first')

  await page.keyboard.press(`${mod}+n`)
  expect(await page.textContent('.ProseMirror')).toBe('Start typing ...')

  await page.type('.ProseMirror', 'second', {delay})
  expect(await page.textContent('.ProseMirror')).toBe('second')

  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="files"]')
  expect(await page.locator('[data-testid="file-list"] > div').count()).toBe(2)

  // discard

  await page.keyboard.press(`${mod}+w`)
  expect(await page.textContent('.ProseMirror')).toBe('Start typing ...')
  expect(await page.locator('[data-testid="file-list"] > div').count()).toBe(2)

  await page.keyboard.press(`${mod}+w`)
  await page.waitForTimeout(100)
  expect(await page.textContent('.ProseMirror')).toBe('first')
  expect(await page.locator('[data-testid="file-list"] > div').count()).toBe(1)
})
