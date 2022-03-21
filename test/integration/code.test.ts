import {clearText, delay, lineTextEq} from './utils'

beforeAll(async () => {
  await page.goto('http://localhost:3000')
  await page.waitForSelector('[data-testid="initialized"]')
  await page.waitForTimeout(10)
})

it('inline code', async () => {
  await page.type('.ProseMirror', 'foo `code` bar', {delay})
  expect(await page.textContent('.ProseMirror p code')).toBe('code')
})

it('code around marks', async () => {
  await clearText()
  await page.type('.ProseMirror', 'foo `inline [link](url) code` bar', {delay})
  await lineTextEq(1, 'foo `inline link code` bar')
  expect(await page.textContent('.ProseMirror a')).toBe('link')
})
