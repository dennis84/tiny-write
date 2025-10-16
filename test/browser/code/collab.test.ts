import {test} from '@playwright/test'
import {v4 as uuidv4} from 'uuid'
import {createYUpdate} from '../../unit/testutil/codemirror-util'
import {setupDB} from '../assistant/mock'
import {assertCodeLineToEqual, delay} from '../utils'

test('existing room', async ({page, browser}) => {
  const id = uuidv4()
  await setupDB(page, {
    files: [{id, ydoc: createYUpdate(id, ''), lastModified: new Date(), versions: [], code: true}],
  })

  await page.goto(`/code/${id}`)
  await page.waitForSelector('[data-testid="initialized"]')
  await page.click('[data-testid="floating_navbar_menu_open"]')
  await page.click('[data-testid="collab"]')

  await page.locator('.cm-content').pressSequentially('Hello', {delay})
  await assertCodeLineToEqual(page, 1, 'Hello')

  const page2 = await browser.newPage()
  await page2.goto(`/code?join=${id}`)
  await page2.click('[data-testid="join_file"]')
  await assertCodeLineToEqual(page2, 1, 'Hello')

  // make sure that cursor is at the start position
  await page2.locator('.cm-content').focus()
  await page2.keyboard.press(`Control+ArrowLeft`)

  await page2.locator('.cm-content').pressSequentially('World', {delay})

  await assertCodeLineToEqual(page2, 1, 'WorldHello')
  await assertCodeLineToEqual(page, 1, 'WorldHello')
})
