import {expect} from 'vitest'
import type {Tree} from '@/tree'

export function expectTree<T>(tree: Tree<T>, str: string) {
  const result = printTree(tree).split('\n')
  let i = 0
  let indent = -1
  for (const line of str.split('\n')) {
    if (!line) continue
    if (indent === -1) indent = line.search(/\S/)
    const l = line.substring(indent)
    expect(result[i]).toBe(l)
    i++
  }
}

export function printTree<T>(tree: Tree<T>) {
  let out = ''

  function printIds(ids: string[], level = 0) {
    for (const id of ids) {
      const item = tree.getItem(id)
      if (!item) continue
      const indent = '  '.repeat(level)
      const parentId = item.parentId ?? ''
      const leftId = item.leftId ?? ''
      out += `${indent}└ ${id} (parentId=${parentId}, leftId=${leftId})\n`
      printIds(item.childrenIds, level + 1)
    }
  }

  printIds(tree.rootItemIds, 0)
  return out
}
