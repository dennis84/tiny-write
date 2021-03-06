beforeAll(async () => {
  await page.goto('http://localhost:3000')
})

it('type text', async () => {
  await page.type('.ProseMirror', 'text')
  expect(await page.textContent('.ProseMirror')).toBe('text')
  await page.keyboard.press('Enter')

  await page.type('.ProseMirror', '# hl1')
  expect(await page.textContent('.ProseMirror h1')).toBe('hl1')
  await page.keyboard.press('Enter')

  await page.type('.ProseMirror', '## hl2')
  expect(await page.textContent('.ProseMirror h2')).toBe('hl2')
  await page.keyboard.press('Enter')

  await page.type('.ProseMirror', '### hl3')
  expect(await page.textContent('.ProseMirror h3')).toBe('hl3')
  await page.keyboard.press('Enter')

  await page.type('.ProseMirror', '> blockquote')
  expect(await page.textContent('.ProseMirror blockquote')).toBe('blockquote')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')

  await page.type('.ProseMirror', '- item1')
  await page.keyboard.press('Enter')
  await page.type('.ProseMirror', 'item2')
  expect(await page.textContent('.ProseMirror ul li:nth-of-type(1)')).toBe('item1')
  expect(await page.textContent('.ProseMirror ul li:nth-of-type(2)')).toBe('item2')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
})
