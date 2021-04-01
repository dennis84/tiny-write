beforeAll(async () => {
  await page.goto('http://localhost:3000')
})

it('inline code', async () => {
  await page.type('.ProseMirror', 'foo `code` bar')
  expect(await page.textContent('.ProseMirror p code')).toBe('code')
})
