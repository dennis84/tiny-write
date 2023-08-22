import {test, expect} from '@playwright/test'
import {delay} from '../utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('type text', async ({page}) => {
  await page.type('.ProseMirror', 'text', {delay})
  expect(await page.textContent('.ProseMirror')).toBe('text')
  await page.keyboard.press('Enter')

  await page.type('.ProseMirror', '# hl1', {delay})
  expect(await page.textContent('.ProseMirror h1')).toBe('hl1')
  await page.keyboard.press('Enter')

  await page.type('.ProseMirror', '## hl2', {delay})
  expect(await page.textContent('.ProseMirror h2')).toBe('hl2')
  await page.keyboard.press('Enter')

  await page.type('.ProseMirror', '### hl3', {delay})
  expect(await page.textContent('.ProseMirror h3')).toBe('hl3')
  await page.keyboard.press('Enter')

  await page.type('.ProseMirror', '> blockquote', {delay})
  expect(await page.textContent('.ProseMirror blockquote')).toBe('blockquote')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')

  await page.type('.ProseMirror', '- item1', {delay})
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', 'item2', {delay})
  expect(await page.textContent('.ProseMirror ul li:nth-of-type(1)')).toBe('item1')
  expect(await page.textContent('.ProseMirror ul li:nth-of-type(2)')).toBe('item2')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
})
