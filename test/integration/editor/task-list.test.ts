import {test, expect} from '@playwright/test'
import {delay, lineTextEq} from '../utils'

const getItem = (listN: number, taskN: number) =>
  `.ProseMirror .task-list:nth-of-type(${listN}) .task-list-item:nth-of-type(${taskN})`

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

test('create tasks', async ({page}) => {
  await page.locator('.ProseMirror').pressSequentially('[ ] task1', {delay})
  await page.keyboard.press('Enter')
  await page.locator('.ProseMirror').pressSequentially('task2', {delay})
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.locator('.ProseMirror').pressSequentially('...', {delay})
  await page.keyboard.press('Enter')
  await page.locator('.ProseMirror').pressSequentially('[x] task3')
  await expect(page.locator(getItem(1, 1))).toHaveText('task1')
  await expect(page.locator(getItem(1, 2))).toHaveText('task2')
  await expect(page.locator(getItem(2, 1))).toHaveText('task3')

  await expect(page.locator(`${getItem(2, 1)} input`)).toBeChecked()
  await page.click(`${getItem(1, 1)} input`)
  await expect(page.locator(`${getItem(1, 1)} input`)).toBeChecked()
})
