import {test, expect} from '@playwright/test'
import {delay, lineTextEq, move} from './utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('markdown table to html and back', async ({page}) => {
  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="markdown"]')

  await page.type('.ProseMirror', '| Foo | Bar | Baz |', {delay})
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '| - | - | -: |', {delay})
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '| 1 | 2 | 3 |', {delay})

  await page.click('[data-testid="markdown"]')

  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(1)')).toBe('Foo')
  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(2)')).toBe('Bar')
  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(3)')).toBe('Baz')
  expect(await page.textContent('.ProseMirror table tr td:nth-of-type(1)')).toBe('1')
  expect(await page.textContent('.ProseMirror table tr td:nth-of-type(2)')).toBe('2')
  expect(await page.textContent('.ProseMirror table tr td:nth-of-type(3)')).toBe('3')

  expect(await page.$eval(
    '.ProseMirror table tr th:nth-of-type(3)',
    (node: HTMLInputElement) => node.style.textAlign)
  ).toBe('right')

  expect(await page.$eval(
    '.ProseMirror table tr td:nth-of-type(3)',
    (node: HTMLInputElement) => node.style.textAlign)
  ).toBe('right')

  await page.click('[data-testid="markdown"]')

  await lineTextEq(page, 1, '| Foo | Bar | Baz |')
  await lineTextEq(page, 2, '| --- | --- | ---:|')
  await lineTextEq(page, 3, '| 1 | 2 | 3 |')

  await page.click('[data-testid="markdown"]')
  await page.click('[data-testid="burger"]')
})

test('table keymap', async ({page}) => {
  await page.type('.ProseMirror', '||| ', {delay})
  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(1)')).toBe('')
  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(2)')).toBe('')
  expect(await page.textContent('.ProseMirror table tr td:nth-of-type(1)')).toBe('')
  expect(await page.textContent('.ProseMirror table tr td:nth-of-type(2)')).toBe('')
  await page.type('.ProseMirror', '1', {delay})
  await move(page, 'ArrowRight')
  await page.type('.ProseMirror', '2', {delay})
  await move(page, 'ArrowRight')
  await page.type('.ProseMirror', '3', {delay})
  await move(page, 'ArrowRight')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '3.1', {delay})
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '5', {delay})
  expect(await page.textContent('.ProseMirror table tr:nth-of-type(1) th:nth-of-type(1)')).toBe('1')
  expect(await page.textContent('.ProseMirror table tr:nth-of-type(1) th:nth-of-type(2)')).toBe('2')
  expect(await page.textContent('.ProseMirror table tr:nth-of-type(2) td:nth-of-type(1)')).toBe('3.1')
  expect(await page.textContent('.ProseMirror table tr:nth-of-type(2) td:nth-of-type(2)')).toBe('')
  expect(await page.textContent('.ProseMirror table tr:nth-of-type(3) td:nth-of-type(1)')).toBe('5')
  expect(await page.textContent('.ProseMirror table tr:nth-of-type(3) td:nth-of-type(2)')).toBe('')
  await page.keyboard.press('Control+Enter')
  await page.type('.ProseMirror', 'outside', {delay})
  await lineTextEq(page, 1, 'outside')
})

test('remove table if empty', async ({page}) => {
  await page.type('.ProseMirror', '||| ', {delay})
  await move(page, 'ArrowRight')
  await move(page, 'ArrowRight')
  await page.keyboard.press('Backspace')
  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(1)')).toBe('')
  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(2)')).toBe('')
  expect(await page.$('.ProseMirror table tr td')).toBe(null)
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Backspace')
  expect(await page.$('.ProseMirror table')).toBe(null)
})

test('arrow up and down', async ({page}) => {
  await page.type('.ProseMirror', '||| ', {delay})
  await page.type('.ProseMirror', '1', {delay})
  await move(page, 'ArrowDown')
  await page.type('.ProseMirror', '3', {delay})
  await move(page, 'ArrowRight')
  await page.type('.ProseMirror', '4', {delay})
  await move(page, 'ArrowUp')
  await page.type('.ProseMirror', '2', {delay})
  await move(page, 'ArrowLeft', 2)
  await move(page, 'ArrowUp', 2)
  await page.type('.ProseMirror', 'test', {delay})
  expect(await page.textContent('.ProseMirror table tr:nth-of-type(1) th:nth-of-type(1)')).toBe('1')
  expect(await page.textContent('.ProseMirror table tr:nth-of-type(1) th:nth-of-type(2)')).toBe('2')
  expect(await page.textContent('.ProseMirror table tr:nth-of-type(2) td:nth-of-type(1)')).toBe('3')
  expect(await page.textContent('.ProseMirror table tr:nth-of-type(2) td:nth-of-type(2)')).toBe('4')
  await lineTextEq(page, 1, 'test')
})
