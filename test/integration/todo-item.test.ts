beforeAll(async () => {
  await page.goto('http://localhost:3000')
})

it('create todos', async () => {
  await page.type('.ProseMirror', '[ ] task1')
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', 'task2')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '...')
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', '[x] task3')
  expect(await page.textContent('.ProseMirror .todo-item:nth-of-type(1)')).toBe('task1')
  expect(await page.textContent('.ProseMirror .todo-item:nth-of-type(2)')).toBe('task2')
  expect(await page.textContent('.ProseMirror .todo-item:nth-of-type(3)')).toBe('task3')

  expect(await page.$eval(
    '.ProseMirror .todo-item:nth-of-type(3) label input',
    (node: HTMLInputElement) => node.checked
  )).toBe(true)

  const inputSel = '.ProseMirror .todo-item:nth-of-type(1) label input'
  await page.click(inputSel)
  expect(await page.$eval(inputSel, (node: HTMLInputElement) => node.checked)).toBe(true)
})
