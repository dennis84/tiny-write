import {expect, test} from 'vitest'
import markdownit from 'markdown-it'
import {taskList} from '../../../src/prosemirror/extension/task-list/markdown'

const md = markdownit({html: false}).use(taskList)

test('render', () => {
  const tokens = md.parse(`
  - [ ] aaa
  - [x] bbb
      - [ ] ccc
  `, {})

  expect(tokens[0].type).toBe('task_list_open')

  expect(tokens[1].type).toBe('task_list_item_open')
  expect(tokens[1].attrGet('checked')).toBe(null)
  expect(tokens[2].type).toBe('paragraph_open')
  expect(tokens[3].type).toBe('inline')
  expect(tokens[3].children[0].content).toBe('aaa')
  expect(tokens[4].type).toBe('paragraph_close')
  expect(tokens[5].type).toBe('task_list_item_close')

  expect(tokens[6].type).toBe('task_list_item_open')
  expect(tokens[6].attrGet('checked')).toBe(true)
  expect(tokens[7].type).toBe('paragraph_open')
  expect(tokens[8].type).toBe('inline')
  expect(tokens[8].children[0].content).toBe('bbb')
  expect(tokens[9].type).toBe('paragraph_close')

  expect(tokens[10].type).toBe('task_list_open')
  expect(tokens[11].type).toBe('task_list_item_open')
  expect(tokens[11].attrGet('checked')).toBe(null)
  expect(tokens[12].type).toBe('paragraph_open')
  expect(tokens[13].type).toBe('inline')
  expect(tokens[13].children[0].content).toBe('ccc')
  expect(tokens[14].type).toBe('paragraph_close')
  expect(tokens[15].type).toBe('task_list_item_close')
  expect(tokens[16].type).toBe('task_list_close')

  expect(tokens[17].type).toBe('task_list_item_close')
  expect(tokens[18].type).toBe('task_list_close')
})
