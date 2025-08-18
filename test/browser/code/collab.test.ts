import {test} from '@playwright/test'
import {v4 as uuidv4} from 'uuid'
import {delay, lineCodeEq} from '../utils'

test('existing room', async ({page, browser}) => {
  const room = uuidv4()
  await page.goto(`/code/${room}?share=true`)
  await page.waitForSelector('[data-testid="initialized"]')
  await page.locator('.cm-content').pressSequentially('Hello', {delay})
  await lineCodeEq(page, 1, 'Hello')

  const page2 = await browser.newPage()
  await page2.goto(`/code/${room}?share=true`)
  await lineCodeEq(page2, 1, 'Hello')

  // make sure that cursor is at the start position
  await page2.locator('.cm-content').focus()
  await page2.keyboard.press(`Control+ArrowLeft`)

  await page2.locator('.cm-content').pressSequentially('World', {delay})

  await lineCodeEq(page2, 1, 'WorldHello')
  await lineCodeEq(page, 1, 'WorldHello')
})
