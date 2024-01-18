import {For, Show, createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {Portal} from 'solid-js/web'
import {unwrap} from 'solid-js/store'
import {css, styled} from 'solid-styled-components'
import {Node} from 'prosemirror-model'
import * as Y from 'yjs'
import {yDocToProsemirrorJSON} from 'y-prosemirror'
import {DragGesture} from '@use-gesture/vanilla'
import {Mode, isFile, useState} from '@/state'
import {createExtensions, createSchema} from '@/prosemirror-setup'
import {TreeNode, TreeNodeItem} from '@/services/TreeService'
import {Label, Link, Sub} from './Menu'
import {Tooltip} from './Tooltip'

const GhostContainer = styled('div')`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
`

const Ghost = styled('div')`
  position: absolute;
  display: none;
  color: var(--foreground);
  font-size: var(--menu-font-size);
  font-family: var(--menu-font-family);
  width: 400px;
  overflow: hidden;
`

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
  targetId?: string;
  pos: 'before' | 'after' | 'add' | 'open' | 'delete';
}

interface Props {
  onBin: () => void;
}

export default (props: Props) => {
  let ghostRef!: HTMLDivElement

  const [state, ctrl] = useState()
  const [dropState, setDropState] = createSignal<DropState>()
  const [toolipAnchor, setTooltipAnchor] = createSignal<HTMLElement | undefined>()
  const [selected, setSelected] = createSignal<TreeNode>()
  const [grabbing, setGrabbing] = createSignal(false)

  const isNode = (node: TreeNode) => dropState()?.targetId === node.item.id

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

  const deleteNode = async (node: TreeNode) => {
    const deleteItem = async (item: TreeNodeItem) => {
      if (isFile(item)) await ctrl.file.deleteFile(item)
      else ctrl.canvas.deleteCanvas(item.id)
    }

    const currentFile = ctrl.file.currentFile
    if (
      state.mode === Mode.Editor &&
      currentFile !== undefined &&
      (node.item.id === currentFile.id || ctrl.tree.isDescendant(currentFile.id, node.tree))
    ) {
      await ctrl.editor.openFile({id: node.item.parentId})
    }

    const proms = [deleteItem(node.item)]
    ctrl.tree.descendants((n) => proms.push(deleteItem(n.item)), node.tree)
    ctrl.tree.create()

    await Promise.all(proms)
  }

  const onDelete = async () => {
    const node = unwrap(selected())
    if (!node) return
    await deleteNode(node)
    closeTooltip()
  }

  onMount(() => {
    ctrl.tree.create()
  })

  const TreeLink = (props: {node: TreeNode; level: number; selected?: boolean}) => {
    let ref!: HTMLButtonElement
    let anchor!: HTMLElement

    const [title, setTitle] = createSignal<string>()

    const onClick = async () => {
      if (isFile(props.node.item)) {
        await ctrl.editor.openFile(props.node.item)
      } else {
        ctrl.canvas.open(props.node.item.id)
      }
    }

    const getTitle = (doc?: Node) => doc?.firstChild?.textContent.substring(0, 50) || 'Untitled'

    const getCurrentId = () =>
      state.mode === Mode.Editor ? ctrl.file.currentFile?.id : ctrl.canvas.currentCanvas?.id

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
        const targetId = el.dataset.id

        if (first) {
          setGrabbing(true)
          setTooltipAnchor(undefined)
          ghostRef.textContent = title() ?? ''
          ghostRef.style.display = 'block'
        }

        ghostRef.style.top = `${y}px`
        ghostRef.style.left = `${x}px`

        if (targetId && targetId !== props.node.item.id && !ctrl.tree.isDescendant(targetId, props.node.tree)) {
          if (y < box.top + offset) {
            setDropState({pos: 'before', targetId})
          } else if (y > box.bottom - offset) {
            setDropState({pos: 'after', targetId})
          } else {
            setDropState({pos: 'add', targetId})
          }
        } else if (el.closest('svg')) {
          setDropState({pos: 'open'})
        } else if (el.closest('#bin')) {
          setDropState({pos: 'delete'})
        } else {
          setDropState(undefined)
        }

        if (last) {
          const ds = dropState()
          if (ds?.targetId) {
            const targetNode = ctrl.tree.findTreeNode(ds.targetId)
            if (targetNode) {
              if (ds.pos === 'add' && isFile(targetNode.item)) {
                ctrl.tree.add(props.node, targetNode)
              } else if (ds.pos === 'before') {
                ctrl.tree.before(props.node, targetNode)
              } else if (ds.pos === 'after') {
                ctrl.tree.after(props.node, targetNode)
              }
            }
          } else if (ds?.pos === 'delete') {
            deleteNode(props.node)
          } else if (ds?.pos === 'open') {
            if (state.mode === Mode.Canvas && isFile(props.node.item)) {
              ctrl.canvas.addFile(props.node.item)
            }
          }

          setDropState(undefined)
          setGrabbing(false)
          ghostRef.style.display = 'none'
        }
      }, {filterTaps: true})

      onCleanup(() => {
        gesture.destroy()
      })
    })

    createEffect(() => {
      if (state.mode !== Mode.Editor) return
      const currentFile = ctrl.file.currentFile
      if (currentFile?.id !== props.node.item.id || !currentFile.editorView) return
      state.lastTr
      setTitle(getTitle(currentFile.editorView.state.doc))
    })

    return (
      <Link
        ref={ref}
        data-id={props.node.item.id}
        data-testid="tree_link"
        onClick={onClick}
        class={css`
          padding-left: ${String(20 * props.level)}px;
          touch-action: none;
          user-drag: element;
          -webkit-user-drag: value;
          ${grabbing() ? `
            cursor: var(--cursor-grabbed);
          ` : ''}
          ${props.node.item.id === getCurrentId() ? `
            font-family: var(--menu-font-family-bold);
            font-weight: bold;
            color: var(--primary-background);
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
          onClick={(e: MouseEvent) => showTooltip(e, anchor, props.node)}
          data-testid="tree_link_menu"
        >
          ⋯
        </LinkMenu>
      </Link>
    )
  }

  const Tree = (props: {tree: TreeNode[]; level: number; selected?: boolean}) => {
    return (
      <For each={props.tree}>
        {(node) => (
          <Show when={!node.item.deleted}>
            <Show when={isNode(node) && dropState()?.pos === 'before'}>
              <DropLine level={props.level} />
            </Show>
            <TreeLink
              node={node}
              selected={props.selected || (isNode(node) && dropState()?.pos === 'add' && isFile(node.item))}
              level={props.level}
            />
            <Show when={node.tree.length > 0}>
              <Tree
                tree={node.tree}
                level={props.level + 1}
                selected={props.selected || isNode(node) && dropState()?.pos === 'add'}
              />
            </Show>
            <Show when={isNode(node) && dropState()?.pos === 'after'}>
              <DropLine level={props.level} />
            </Show>
          </Show>
        )}
      </For>
    )
  }

  return (
    <>
      <Label>Storage</Label>
      <Sub data-tauri-drag-region="true">
        <Tree tree={ctrl.tree.tree} level={0} />
        <Link
          id="bin"
          onClick={props.onBin}
          data-testid="bin"
          class={dropState()?.pos === 'delete' ? css`
            background: var(--primary-background-20);
          ` : undefined}
        >└ Bin 🗑️</Link>
      </Sub>
      <Portal mount={document.getElementById('container') as HTMLElement}>
        <Show when={grabbing()}>
          <GhostContainer>
            <Ghost ref={ghostRef} />
          </GhostContainer>
        </Show>
      </Portal>
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
