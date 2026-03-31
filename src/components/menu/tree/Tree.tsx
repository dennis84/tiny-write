import {For} from 'solid-js'
import {TreeItem} from './TreeItem'

export const Tree = (p: {childrenIds: string[]; level: number}) => (
  <For each={p.childrenIds}>{(id) => <TreeItem id={id} level={p.level} />}</For>
)
