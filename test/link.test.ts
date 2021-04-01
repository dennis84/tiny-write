import {move, lineText} from './utils'

beforeAll(async () => {
  await page.goto('http://localhost:3000')
})

it('create link', async () => {
  await page.type('.ProseMirror', 'foo [title](url) bar')
  expect(await lineText()).toBe('foo title bar')
  await move('ArrowLeft', 4)
  expect(await lineText()).toBe('foo title bar')
  await move('ArrowLeft')
  expect(await lineText()).toBe('foo [title](url) bar')
  await move('ArrowRight', 7)
  expect(await lineText()).toBe('foo [title](url) bar')
  await move('ArrowRight')
  expect(await lineText()).toBe('foo title bar')
  await move('ArrowRight', 3)
  await page.type('.ProseMirror', ' [other](link) ')
  expect(await lineText()).toBe('foo title bar other ')
  await move('ArrowLeft', 2)
  expect(await lineText()).toBe('foo title bar [other](link) ')
})

it('new line', async () => {
  await move('ArrowDown', 2)
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', 'test [another](path) ')
  await move('ArrowLeft', 7)
  await move('ArrowUp')
  await move('ArrowLeft') // must move 1 to the side before expand
  expect(await lineText()).toBe('foo [title](url) bar other ')
  expect(await lineText(2)).toBe('test another ')
})
