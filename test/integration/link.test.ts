import {delay, move, lineTextEq} from './utils'

beforeAll(async () => {
  await page.goto('http://localhost:3000')
  await page.waitForSelector('[data-testid="initialized"]')
  await page.waitForTimeout(10)
})

it('create link', async () => {
  await page.type('.ProseMirror', 'foo [title](url) bar', {delay})
  await lineTextEq(1, 'foo title bar')
  await move('ArrowLeft', 4)
  await lineTextEq(1, 'foo title bar')
  await move('ArrowLeft')
  await lineTextEq(1, 'foo [title](url) bar')
  await move('ArrowRight', 7)
  await lineTextEq(1, 'foo [title](url) bar')
  await move('ArrowRight')
  await lineTextEq(1, 'foo title bar')
  await move('ArrowRight', 3)
  await page.type('.ProseMirror', ' [other](link) ', {delay})
  await lineTextEq(1, 'foo title bar other ')
  await move('ArrowLeft', 2)
  await lineTextEq(1, 'foo title bar [other](link) ')
  await move('ArrowLeft', 11)
  await lineTextEq(1, 'foo [title](url) bar other ')
  await move('ArrowRight', 13)
  await lineTextEq(1, 'foo title bar [other](link) ')
})

it('new line', async () => {
  await move('ArrowDown', 2)
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', 'test [another](path).', {delay})
  await move('ArrowLeft', 7)
  await move('ArrowUp')
  await move('ArrowLeft') // must move 1 to the side before expand
  expect(await lineTextEq(1, 'foo [title](url) bar other '))
  expect(await lineTextEq(2, 'test another.'))
})

it('links in code', async () => {
  await move('ArrowDown', 2)
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', 'test `inline code` ', {delay})
  await move('ArrowLeft', 5)
  await page.type('.ProseMirror', '[foo](bar) ', {delay})
  await move('ArrowRight', 5)
  await page.type('.ProseMirror', '123', {delay})
  expect(await lineTextEq(3, 'test inline [foo](bar) code 123'))
})
