beforeAll(async () => {
  await page.goto('http://localhost:3000')
})

it('create image', async () => {
  await page.type('.ProseMirror', '![](http://localhost:3000/screenshot-light.png) ')
  await page.waitForSelector('.ProseMirror p .image-container img')
})
