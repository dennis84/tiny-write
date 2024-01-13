import {For, Show, createSignal, onCleanup, onMount} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Node} from 'prosemirror-model'
import * as Y from 'yjs'
import {yDocToProsemirrorJSON} from 'y-prosemirror'
import {DragGesture} from '@use-gesture/vanilla'
import {File, useState} from '@/state'
import {createExtensions, createSchema} from '@/prosemirror-setup'
import {TreeNode} from '@/services/TreeService'
import {Label, Link, Sub} from './Menu'

const DropLine = styled('div')`
  position: absolute;
  height: 4px;
  border-radius: 4px;
  width: 100%;
  background: var(--primary-background-50);
  pointer-events: none;
  z-index: 1;
  margin-left: ${(props: any) => 20 * props.level}px;
`

interface DropState {
  id: string;
  pos: 'above' | 'below' | 'nested';
}

export default () => {
  const [, ctrl] = useState()
  const [dropState, setDropState] = createSignal<DropState>()

  const isFile = (it: any): it is File => it.ydoc !== undefined

  const isNode = (node: TreeNode) => dropState()?.id === node.item.id

  const schema = createSchema(createExtensions({ctrl, markdown: false}))

  onMount(() => {
    ctrl.tree.create()
  })

  const TreeNodeLink = (props: {node: TreeNode; level: number; selected?: boolean}) => {
    let ref!: HTMLButtonElement
    const [title, setTitle] = createSignal<string>()

    onMount(() => {
      if (isFile(props.node.item)) {
        const ydoc = new Y.Doc({gc: false})
        Y.applyUpdate(ydoc, props.node.item.ydoc)
        const state = yDocToProsemirrorJSON(ydoc, props.node.item.id)
        const doc = Node.fromJSON(schema, state)
        setTitle(doc.firstChild?.textContent?.substring(0, 50) ?? 'Untitled')
      } else {
        setTitle('🧑‍🎨 Canvas')
      }

      const offset = 10

      const gesture = new DragGesture(ref, ({xy: [x, y], last}) => {
        const el = document.elementFromPoint(x, y) as HTMLElement
        const box = el?.getBoundingClientRect()
        const id = el.dataset.id

        if (id && id !== props.node.item.id && !ctrl.tree.isDescendant(id, props.node.tree)) {
          if (y < box.top + offset) {
            setDropState({pos: 'above', id})
          } else if (y > box.bottom - offset) {
            setDropState({pos: 'below', id})
          } else {
            setDropState({pos: 'nested', id})
          }
        } else {
          setDropState(undefined)
        }

        if (last) {
          const ds = dropState()
          if (ds) {
            const targetNode = ctrl.tree.findTreeNode(ds.id)
            if (targetNode) {
              if (ds.pos === 'nested' && isFile(targetNode.item)) {
                ctrl.tree.add(props.node, targetNode)
              } else if (ds.pos === 'above') {
                ctrl.tree.before(props.node, targetNode)
              } else if (ds.pos === 'below') {
                ctrl.tree.after(props.node, targetNode)
              }
            }

            setDropState(undefined)
          }
        }
      })

      onCleanup(() => {
        gesture.destroy()
      })
    })

    return (
      <Link
        ref={ref}
        data-id={props.node.item.id}
        style={{
          'padding-left': `${20 * props.level}px`,
          'touch-action': 'none',
          ...(props.selected ? {
            'background': 'var(--primary-background-20)',
          } : {}),
        }}
      >
        {'>'} {title()}
      </Link>
    )
  }

  const Tree = (props: {tree: TreeNode[]; level: number; selected?: boolean}) => {
    return (
      <For each={props.tree}>
        {(node) => <Show when={!node.item.deleted}>
          <Show when={isNode(node) && dropState()?.pos === 'above'}>
            <DropLine level={props.level} />
          </Show>
          <TreeNodeLink
            node={node}
            selected={props.selected || (isNode(node) && dropState()?.pos === 'nested' && isFile(node.item))}
            level={props.level}
          />
          <Show when={node.tree.length > 0}>
            <Tree
              tree={node.tree}
              level={props.level + 1}
              selected={isNode(node) && dropState()?.pos === 'nested'}
            />
          </Show>
          <Show when={isNode(node) && dropState()?.pos === 'below'}>
            <DropLine level={props.level} />
          </Show>
        </Show>}
      </For>
    )
  }

  return (
    <>
      <Label>Tree</Label>
      <Sub data-tauri-drag-region="true">
        <Tree tree={ctrl.tree.tree} level={0} />
      </Sub>
    </>
  )
}
