export const lineText = async (nth = 1) =>
  (await page.textContent(`.ProseMirror p:nth-of-type(${nth})`)).replace(/\xa0/g, ' ')

export const move = async (key, repeat = 1) => {
  for (let i = 0; i < repeat; i ++) {
    await page.keyboard.down(key)
    await page.keyboard.up(key)
  }
}

export const clearText = async () => {
  const discard = await page.$$('[data-testid="discard"]')
  if (!discard.length) {
    await page.click('[data-testid="burger"]')
  }

  const disabled = await page.$$('[data-testid="discard"]:disabled')
  if (!disabled.length) {
    await page.click('[data-testid="discard"]')
  }

  await page.click('[data-testid="burger"]')
  expect(await lineText()).toBe('Start typing ...')
}
