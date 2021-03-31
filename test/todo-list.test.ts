beforeAll(async () => {
  await page.goto('http://localhost:3000')
})

it('create todos', async () => {
  await page.type('.ProseMirror', '[ ] task1')
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', 'task2')
  expect(await page.textContent('.ProseMirror .todo-list > div:nth-of-type(1)')).toBe('task1')
  expect(await page.textContent('.ProseMirror .todo-list > div:nth-of-type(2)')).toBe('task2')

  const inputSel = '.ProseMirror .todo-list > div:nth-of-type(1) > input'
  await page.click(inputSel)
  expect(await page.$eval(inputSel, (node: HTMLInputElement) => node.checked)).toBe(true)
})
