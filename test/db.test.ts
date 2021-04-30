beforeAll(async () => {
  await page.goto('http://localhost:3000')
})

it('init', async () => {
  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('button')
  expect(await page.textContent('[data-testid="last-modified"]')).toContain('Nothing yet')
  await page.type('.ProseMirror', 'foo')
  expect(await page.textContent('[data-testid="last-modified"]')).not.toContain('Nothing yet')
})

it('reload', async () => {
  await page.waitForTimeout(200)
  await page.reload()
  await page.waitForSelector('[data-testid="initialized"]')
  expect(await page.textContent('.ProseMirror p')).toBe('foo')
})
