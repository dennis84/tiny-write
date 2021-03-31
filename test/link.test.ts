beforeAll(async () => {
  await page.goto('http://localhost:3000')
})

const firstLine = async () =>
  (await page.textContent('.ProseMirror p')).replaceAll('\xa0', ' ')

const move = async (key, repeat = 1) => {
  for (let i = 0; i < repeat; i ++) {
    await page.keyboard.down(key)
    await page.keyboard.up(key)
  }
}

it('create link', async () => {
  await page.type('.ProseMirror', 'foo [title](url) bar')
  expect(await firstLine()).toBe('foo title bar')
  await move('ArrowLeft', 4)
  expect(await firstLine()).toBe('foo title bar')
  await move('ArrowLeft')
  expect(await firstLine()).toBe('foo [title](url) bar')
  await move('ArrowRight', 7)
  expect(await firstLine()).toBe('foo [title](url) bar')
  await move('ArrowRight')
  expect(await firstLine()).toBe('foo title bar')
  await move('ArrowRight', 3)
  await page.type('.ProseMirror', ' [other](link) ')
  expect(await firstLine()).toBe('foo title bar other ')
  await move('ArrowLeft', 2)
  expect(await firstLine()).toBe('foo title bar [other](link) ')
})
