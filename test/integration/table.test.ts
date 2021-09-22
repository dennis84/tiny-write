import {clearText, lineText, move} from './utils'

beforeAll(async () => {
  await page.goto('http://localhost:3000')
})

it('markdown table to html and back', async () => {
  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="markdown"]')

  await page.type('.ProseMirror', '| Foo | Bar | Baz |')
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '| - | - | -: |')
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '| 1 | 2 | 3 |')

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

  expect(await lineText(1)).toBe('| Foo | Bar | Baz |')
  expect(await lineText(2)).toBe('| --- | --- | ---:|')
  expect(await lineText(3)).toBe('| 1 | 2 | 3 |')

  await page.click('[data-testid="markdown"]')
  await page.click('[data-testid="burger"]')
})

it('table keymap', async () => {
  await clearText()
  await page.type('.ProseMirror', '||| ')
  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(1)')).toBe('')
  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(2)')).toBe('')
  expect(await page.textContent('.ProseMirror table tr td:nth-of-type(1)')).toBe('')
  expect(await page.textContent('.ProseMirror table tr td:nth-of-type(2)')).toBe('')
  await page.type('.ProseMirror', '1')
  await move('ArrowRight')
  await page.type('.ProseMirror', '2')
  await move('ArrowRight')
  await page.type('.ProseMirror', '3')
  await move('ArrowRight')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '3.1')
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '5')
  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(1)')).toBe('1')
  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(2)')).toBe('2')
  expect(await page.textContent('.ProseMirror table tr:nth-of-type(1) td:nth-of-type(1)')).toBe('3.1')
  expect(await page.textContent('.ProseMirror table tr:nth-of-type(1) td:nth-of-type(2)')).toBe('')
  expect(await page.textContent('.ProseMirror table tr:nth-of-type(2) td:nth-of-type(1)')).toBe('5')
  expect(await page.textContent('.ProseMirror table tr:nth-of-type(2) td:nth-of-type(2)')).toBe('')
  await page.keyboard.press('Control+Enter')
  await page.type('.ProseMirror', 'outside')
  expect(await lineText(2)).toBe('outside')
})
