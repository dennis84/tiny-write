import {test, expect, type Page} from '@playwright/test'
import {delay, lineTextEq, move} from '../utils'

test.beforeEach(async ({page}) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="initialized"]')
})

const getNthCell = (page: Page, row: number, col: number) =>
  page.locator(`.ProseMirror table tr:nth-of-type(${row}) > *:nth-of-type(${col})`)

test('table keymap', async ({page}) => {
  await page.locator('.ProseMirror').pressSequentially('||| ', {delay})
  await expect(page.locator('.ProseMirror table tr th:nth-of-type(1)')).toHaveText('')
  await expect(page.locator('.ProseMirror table tr th:nth-of-type(2)')).toHaveText('')
  await expect(page.locator('.ProseMirror table tr td:nth-of-type(1)')).toHaveText('')
  await expect(page.locator('.ProseMirror table tr td:nth-of-type(2)')).toHaveText('')
  await page.locator('.ProseMirror').pressSequentially('1', {delay})
  await move(page, 'ArrowRight')
  await page.locator('.ProseMirror').pressSequentially('2', {delay})
  await move(page, 'ArrowRight')
  await page.locator('.ProseMirror').pressSequentially('3', {delay})
  await move(page, 'ArrowRight')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Enter')
  await page.locator('.ProseMirror').pressSequentially('3.1', {delay})
  await page.keyboard.press('Enter')
  await page.locator('.ProseMirror').pressSequentially('5', {delay})
  await expect(getNthCell(page, 1, 1)).toHaveText('1')
  await expect(getNthCell(page, 1, 2)).toHaveText('2')
  await expect(getNthCell(page, 2, 1)).toHaveText('3.1')
  await expect(getNthCell(page, 2, 2)).toHaveText('')
  await expect(getNthCell(page, 3, 1)).toHaveText('5')
  await expect(getNthCell(page, 3, 2)).toHaveText('')
  await page.keyboard.press('Control+Enter')
  await page.locator('.ProseMirror').pressSequentially('outside', {delay})
  await lineTextEq(page, 2, 'outside')
})

test('remove table if empty', async ({page}) => {
  await page.locator('.ProseMirror').pressSequentially('||| ', {delay})
  await move(page, 'ArrowRight')
  await move(page, 'ArrowRight')
  await page.keyboard.press('Backspace')
  await expect(page.locator('.ProseMirror table tr th:nth-of-type(1)')).toHaveText('')
  await expect(page.locator('.ProseMirror table tr th:nth-of-type(2)')).toHaveText('')
  await expect(page.locator('.ProseMirror table tr td')).toHaveCount(0)
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Backspace')
  await expect(page.locator('.ProseMirror table')).toHaveCount(0)
})

test('arrow up and down', async ({page}) => {
  await page.locator('.ProseMirror').pressSequentially('||| ', {delay})
  await page.locator('.ProseMirror').pressSequentially('1', {delay})
  await move(page, 'ArrowDown')
  await page.locator('.ProseMirror').pressSequentially('3', {delay})
  await move(page, 'ArrowRight')
  await page.locator('.ProseMirror').pressSequentially('4', {delay})
  await move(page, 'ArrowUp')
  await page.locator('.ProseMirror').pressSequentially('2', {delay})
  await move(page, 'ArrowLeft', 2)
  await move(page, 'ArrowUp', 2)
  await page.locator('.ProseMirror').pressSequentially('test', {delay})

  await expect(getNthCell(page, 1, 1)).toHaveText('1')
  await expect(getNthCell(page, 1, 2)).toHaveText('2')
  await expect(getNthCell(page, 2, 1)).toHaveText('3')
  await expect(getNthCell(page, 2, 2)).toHaveText('4')
  await lineTextEq(page, 1, 'test')
})
