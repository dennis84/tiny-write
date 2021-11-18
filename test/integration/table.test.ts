import {clearText, lineTextEq, move} from './utils'

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

  await lineTextEq(1, '| Foo | Bar | Baz |')
  await lineTextEq(2, '| --- | --- | ---:|')
  await lineTextEq(3, '| 1 | 2 | 3 |')

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
  await lineTextEq(1, 'outside')
})

it('dont remove table head', async () => {
  await clearText()
  await page.type('.ProseMirror', '||| ')
  await move('ArrowRight')
  await move('ArrowRight')
  await page.type('.ProseMirror', '3')
  await move('ArrowLeft')
  await move('ArrowLeft')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Backspace')
  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(1)')).toBe('')
  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(2)')).toBe('')
  expect(await page.textContent('.ProseMirror table tr td:nth-of-type(1)')).toBe('3')
  expect(await page.textContent('.ProseMirror table tr td:nth-of-type(2)')).toBe('')
})

it('remove table if empty', async () => {
  await clearText()
  await page.type('.ProseMirror', '||| ')
  await move('ArrowRight')
  await move('ArrowRight')
  await page.keyboard.press('Backspace')
  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(1)')).toBe('')
  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(2)')).toBe('')
  expect(await page.$('.ProseMirror table tr td')).toBe(null)
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Backspace')
  expect(await page.$('.ProseMirror table')).toBe(null)
})

it('arrow up and down', async () => {
  await clearText()
  await page.type('.ProseMirror', '||| ')
  await page.type('.ProseMirror', '1')
  await move('ArrowDown')
  await page.type('.ProseMirror', '3')
  await move('ArrowRight')
  await page.type('.ProseMirror', '4')
  await move('ArrowUp')
  await page.type('.ProseMirror', '2')
  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(1)')).toBe('1')
  expect(await page.textContent('.ProseMirror table tr th:nth-of-type(2)')).toBe('2')
  expect(await page.textContent('.ProseMirror table tr:nth-of-type(1) td:nth-of-type(1)')).toBe('3')
  expect(await page.textContent('.ProseMirror table tr:nth-of-type(1) td:nth-of-type(2)')).toBe('4')
})
