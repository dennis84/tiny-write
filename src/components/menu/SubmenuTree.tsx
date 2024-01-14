import {For, Show, createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {unwrap} from 'solid-js/store'
import {css, styled} from 'solid-styled-components'
import {Node} from 'prosemirror-model'
import * as Y from 'yjs'
import {yDocToProsemirrorJSON} from 'y-prosemirror'
import {DragGesture} from '@use-gesture/vanilla'
import {File, Mode, useState} from '@/state'
import {createExtensions, createSchema} from '@/prosemirror-setup'
import {TreeNode, TreeNodeItem} from '@/services/TreeService'
import {Label, Link, Sub} from './Menu'
import {Tooltip} from './Tooltip'

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

const LinkMenu = styled('span')`
  opacity: 0;
  padding: 0 5px;
  border-radius: 5px;
  font-weight: bold;
  color: var(--foreground);
  ${(props: any) => props.selected ? `
    opacity: 1;
    background: var(--foreground-10);
  ` : ''}
  &:hover {
    background: var(--foreground-10);
  }
`

interface DropState {
  id?: string;
  pos: 'above' | 'below' | 'nested' | 'open';
}

interface Props {
  onBin: () => void;
}

export default (props: Props) => {
  const [state, ctrl] = useState()
  const [dropState, setDropState] = createSignal<DropState>()
  const [toolipAnchor, setTooltipAnchor] = createSignal<HTMLElement | undefined>()
  const [selected, setSelected] = createSignal<TreeNode>()

  const isFile = (it: any): it is File => it?.ydoc !== undefined

  const isNode = (node: TreeNode) => dropState()?.id === node.item.id

  const schema = createSchema(createExtensions({ctrl, markdown: false}))

  const closeTooltip = () => {
    setTooltipAnchor(undefined)
    setSelected(undefined)
  }

  const showTooltip = (e: MouseEvent, anchor: HTMLElement, node: TreeNode) => {
    e.stopPropagation()
    setTooltipAnchor(anchor)
    setSelected(node)
  }

  const onAddFile = async () => {
    const target = unwrap(selected())
    if (!target) return
    await ctrl.editor.newFile()
    const currentFile =  ctrl.file.currentFile
    if (!currentFile) return
    ctrl.tree.add({item: currentFile, tree: []}, target)
    closeTooltip()
  }

  const onAddCanvas = () => {
    const target = unwrap(selected())
    if (!target) return
    ctrl.canvas.newCanvas()
    const currentCanvas =  ctrl.canvas.currentCanvas
    if (!currentCanvas) return
    ctrl.tree.add({item: currentCanvas, tree: []}, target)
    closeTooltip()
  }

  const onDelete = async () => {
    const node = unwrap(selected())
    if (!node) return
    const deleteItem = async (item: TreeNodeItem) => {
      if (isFile(item)) await ctrl.file.deleteFile(item)
      else ctrl.canvas.deleteCanvas(item.id)
    }

    const proms = [deleteItem(node.item)]
    ctrl.tree.descendants((n) => proms.push(deleteItem(n.item)), node.tree)
    await Promise.all(proms)

    closeTooltip()
  }

  onMount(() => {
    ctrl.tree.create()
  })

  const TreeNodeLink = (props: {node: TreeNode; level: number; selected?: boolean}) => {
    let ref!: HTMLButtonElement
    let anchor!: HTMLElement

    const [title, setTitle] = createSignal<string>()
    const [grabbing, setGrabbing] = createSignal(false)

    const onClick = async () => {
      if (isFile(props.node.item)) {
        await ctrl.editor.openFile(props.node.item)
      } else {
        ctrl.canvas.open(props.node.item.id)
      }
    }

    const getTitle = (doc?: Node) => doc?.firstChild?.textContent.substring(0, 50) || 'Untitled'

    createEffect(() => {
      if (state.mode !== Mode.Editor) return
      const currentFile = ctrl.file.currentFile
      if (currentFile?.id !== props.node.item.id || !currentFile.editorView) return
      state.lastTr
      setTitle(getTitle(currentFile.editorView.state.doc))
    })

    onMount(() => {
      if (isFile(props.node.item)) {
        const ydoc = new Y.Doc({gc: false})
        Y.applyUpdate(ydoc, props.node.item.ydoc)
        const state = yDocToProsemirrorJSON(ydoc, props.node.item.id)
        const doc = Node.fromJSON(schema, state)
        setTitle(getTitle(doc))
      } else {
        setTitle('Canvas 🧑‍🎨')
      }

      const offset = 10

      const gesture = new DragGesture(ref, ({xy: [x, y], last, first}) => {
        const el = document.elementFromPoint(x, y) as HTMLElement
        const box = el?.getBoundingClientRect()
        const id = el.dataset.id

        if (first) setGrabbing(true)

        if (id && id !== props.node.item.id && !ctrl.tree.isDescendant(id, props.node.tree)) {
          if (y < box.top + offset) {
            setDropState({pos: 'above', id})
          } else if (y > box.bottom - offset) {
            setDropState({pos: 'below', id})
          } else {
            setDropState({pos: 'nested', id})
          }
        } else if (el.closest('svg')) {
          setDropState({pos: 'open'})
        } else {
          setDropState(undefined)
        }

        if (last) {
          const ds = dropState()
          if (ds?.id) {
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
          } else if (ds?.pos === 'open') {
            if (state.mode === Mode.Canvas && isFile(props.node.item)) {
              ctrl.canvas.addFile(props.node.item)
            }
          }

          setGrabbing(false)
        }
      }, {filterTaps: true})

      onCleanup(() => {
        gesture.destroy()
      })
    })

    return (
      <Link
        ref={ref}
        data-id={props.node.item.id}
        onClick={onClick}
        class={css`
          padding-left: ${String(20 * props.level)}px;
          touch-action: none;
          ${grabbing() ? `
            cursor: var(--cursor-grabbed);
          ` : ''}
          ${props.selected ? `
            background: var(--primary-background-20);
          ` : ''}
          &:hover > span {
            opacity: 1;
          }
        `}
      >
        └ {title()}
        <LinkMenu
          ref={anchor}
          selected={selected() === props.node}
          onClick={(e: MouseEvent) => showTooltip(e, anchor, props.node)}>
          ⋯
        </LinkMenu>
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
      <Label>Storage</Label>
      <Sub data-tauri-drag-region="true">
        <Tree tree={ctrl.tree.tree} level={0} />
        <Link
          onClick={props.onBin}
          data-testid="bin"
        >└ Bin 🗑️</Link>
      </Sub>
      <Show when={toolipAnchor() !== undefined}>
        <Tooltip anchor={toolipAnchor()} onClose={() => closeTooltip()}>
          <Show when={isFile(selected()?.item)}>
            <div onClick={onAddFile} data-testid="add_file">✍️ Add file</div>
            <div onClick={onAddCanvas} data-testid="add_canvas">🧑‍🎨 Add canvas</div>
            <hr class="divider" />
          </Show>
          <div onClick={onDelete} data-testid="delete">🗑️ Delete</div>
        </Tooltip>
      </Show>
    </>
  )
}
