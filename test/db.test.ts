beforeAll(async () => {
  await page.goto('http://localhost:3000')
})

it('reload', async () => {
  await page.waitForSelector('[data-testid="initialized"]')
  await page.type('.ProseMirror', 'foo')
  await page.waitForTimeout(200)
  await page.reload()
  await page.waitForSelector('[data-testid="initialized"]')
  expect(await page.textContent('.ProseMirror p')).toBe('foo')
})
