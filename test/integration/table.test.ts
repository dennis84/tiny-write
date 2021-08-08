import {lineText} from './utils'

beforeAll(async () => {
  await page.goto('http://localhost:3000')
  await page.click('[data-testid="burger"]')
  await page.click('[data-testid="markdown"]')
})

it('markdown table to html and back', async () => {
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
})
