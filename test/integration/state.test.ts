import {test, expect} from '@playwright/test'
import {delay} from './utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
})

test('load state from db', async ({page}) => {
  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('[data-testid="burger"]')
  expect(await page.textContent('[data-testid="last-modified"]')).toContain('Nothing yet')
  await page.type('.ProseMirror', 'foo', {delay})
  expect(await page.textContent('[data-testid="last-modified"]')).not.toContain('Nothing yet')

  await page.waitForTimeout(200)
  await page.reload()
  await page.waitForSelector('[data-testid="initialized"]')
  expect(await page.textContent('.ProseMirror p')).toBe('foo')
})

test('open file', async ({page}) => {
  await page.waitForSelector('[data-testid="initialized"]')
  await page.type('.ProseMirror', 'test1', {delay})
  await page.waitForTimeout(200)
  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="new"]')
  expect(await page.textContent('.ProseMirror p')).toBe('Start typing ...')
  await page.click('[data-testid="files"]')
  expect(await page.textContent('[data-testid="file-list"] > div')).toContain('test1')
  await page.click('[data-testid="back"]')
  await page.type('.ProseMirror', 'test2', {delay})
  await page.waitForTimeout(200)
  await page.click('[data-testid="new"]')
  expect(await page.textContent('.ProseMirror p')).toBe('Start typing ...')
  await page.click('[data-testid="files"]')
  expect(await page.textContent('[data-testid="file-list"] > div:nth-child(1)')).toContain('test1')
  expect(await page.textContent('[data-testid="file-list"] > div:nth-child(2)')).toContain('test2')
  await page.click('[data-testid="file-list"] > div:nth-child(1) > div')
  expect(await page.textContent('.ProseMirror p')).toBe('test1')
  expect(await page.locator('[data-testid="file-list"] > div').count()).toBe(1)
})
