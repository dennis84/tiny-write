export const lineTextEq = async (nth: number, text: string) =>
  (await page.$(`.ProseMirror p:nth-of-type(${nth})`)).evaluate((elem, t) => {
    const textContent = elem.textContent.replace(/\xa0/g, ' ')
    if (textContent !== t) throw Error(`${t} != ${textContent}`)
  }, text)

export const move = async (key: string, repeat = 1) => {
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
  await lineTextEq(1, 'Start typing ...')
}
