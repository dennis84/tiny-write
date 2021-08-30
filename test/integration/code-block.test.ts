import {move} from './utils'

const code = `const foo='bar'`

beforeAll(async () => {
  await page.goto('http://localhost:3000')
})

it('code block', async () => {
  await page.type('.ProseMirror', '```js ')
  await page.waitForSelector('.codemirror-outer')
  await page.type('.codemirror-inner > .cm-editor .cm-content', code)
  expect(await page.$eval('.codemirror-outer .lang-toggle img', (node) => node.getAttribute('title'))).toBe('javascript')
})

it('prettify', async () => {
  await page.click('.prettify')
  expect(await page.textContent('.codemirror-inner > .cm-editor .cm-content')).toBe(`const foo = 'bar'`)
})

it('change lang', async () => {
  await page.click('.codemirror-outer .lang-toggle')
  await page.type('.codemirror-outer .lang-input', 'ts')
  await page.keyboard.press('Enter')
  expect(await page.$eval('.codemirror-outer .lang-toggle img', (node) => node.getAttribute('title'))).toBe('typescript')
})

it('create line above', async () => {
  await move('ArrowUp')
  await page.type('.ProseMirror p', 'above')
  expect(await page.textContent('.ProseMirror p:nth-of-type(1)')).toBe('above')
})

it('create line below', async () => {
  await move('ArrowDown', 2)
  await page.keyboard.press('Control+Enter')
  await page.type('.ProseMirror p', 'below')
  expect(await page.textContent('.ProseMirror p:nth-of-type(2)')).toBe('below')
})
