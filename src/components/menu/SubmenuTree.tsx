import {For, Match, Show, Switch, createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {Portal} from 'solid-js/web'
import {unwrap} from 'solid-js/store'
import {css, styled} from 'solid-styled-components'
import {DragGesture} from '@use-gesture/vanilla'
import {Mode, isCanvas, isCodeFile, isFile, useState} from '@/state'
import {TreeNode, TreeNodeItem} from '@/services/TreeService'
import {FileService} from '@/services/FileService'
import {Label, Link, Sub, Text} from './Menu'
import {Tooltip} from '../Tooltip'
import {Icon} from '../Icon'

const HighlightContent = styled('div')`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 400px;
  border: 10px solid var(--primary-background-50);
  user-select: none;
  pointer-events: none;
`

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

const TreeLinkCorner = styled('i')`
  margin-right: 5px;
  cursor: var(--cursor-pointer);
  font-family: monospace;
  font-weight: normal;
  font-style: normal;
  display: flex;
  color: var(--foreground-50);
  ${(props: any) => props.highlight ? `color: var(--primary-background);` : ''}
  ${(props: any) => props.level ? `margin-left: ${String(20 * props.level)}px;` : ''}
  ${(props: any) => props.expandable ? `
    &:hover {
      background: var(--foreground-10);
      border-radius: var(--border-radius);
    }
  ` : ''}
`

const TreeLinkTitle = styled('span')`
  cursor: var(--cursor-pointer);
  width: 100%;
  touch-action: none;
  ${(props: any) => props.highlight ? `color: var(--primary-background-80);` : ''}
  ${(props: any) => props.grabbing ? 'cursor: var(--cursor-grabbed);' : ''}
`

const LinkMenu = styled('span')`
  justify-self: flex-end;
  display: flex;
  align-items: center;
  margin-left: auto;
  cursor: var(--cursor-pointer);
  opacity: 0;
  border-radius: var(--border-radius);
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
  onBin?: () => void;
  maybeHide?: () => void;
  showDeleted?: boolean;
}

export const SubmenuTree = (props: Props) => {
  let ghostRef!: HTMLDivElement
  let binRef!: HTMLButtonElement

  const [state, ctrl] = useState()
  const [dropState, setDropState] = createSignal<DropState>()
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement | undefined>()
  const [selected, setSelected] = createSignal<TreeNode>()
  const [grabbing, setGrabbing] = createSignal(false)

  const isNode = (node: TreeNode) => dropState()?.targetId === node.item.id

  const closeTooltip = () => {
    setTooltipAnchor(undefined)
    setSelected(undefined)
  }

  const showTooltip = (e: MouseEvent, anchor: HTMLElement, node: TreeNode) => {
    e.stopPropagation()
    setTooltipAnchor(anchor)
    setSelected(node)
  }

  const onRename = async () => {
    const item = selected()?.item
    if (!item) return

    closeTooltip()
    ctrl.app.setInputLine({
      value: item?.title ?? '',
      onEnter: (value: string) => {
        const title = value.trim() || undefined
        if (isFile(item)) {
          ctrl.file.updateFile(item.id, {title})
          FileService.saveFile(item)
        } else {
          ctrl.canvas.updateCanvas(item.id, {title})
          ctrl.canvas.saveCanvas(item)
        }
      }
    })
  }

  const onAddFile = async () => {
    const target = unwrap(selected())
    if (!target) return
    await ctrl.editor.newFile()
    const currentFile =  ctrl.file.currentFile
    if (!currentFile) return
    await ctrl.tree.add({item: currentFile, tree: []}, target)
    if (ctrl.tree.isCollapsed(target)) {
      await ctrl.tree.collapse(target)
    }

    closeTooltip()
  }

  const onAddCanvas = async () => {
    const target = unwrap(selected())
    if (!target) return
    await ctrl.canvas.newCanvas()
    const currentCanvas =  ctrl.canvas.currentCanvas
    if (!currentCanvas) return
    await ctrl.tree.add({item: currentCanvas, tree: []}, target)
    closeTooltip()
  }

  const onAddCode = async () => {
    const target = unwrap(selected())
    if (!target) return
    await ctrl.code.newFile()
    const currentFile =  ctrl.file.currentFile
    if (!currentFile) return
    await ctrl.tree.add({item: currentFile, tree: []}, target)
    closeTooltip()
  }

  const deleteNode = async (node: TreeNode) => {
    const deleteItem = async (item: TreeNodeItem) =>
      isFile(item)
        ? ctrl.file.deleteFile(item.id)
        : ctrl.canvas.deleteCanvas(item.id)

    const currentFile = ctrl.file.currentFile
    if (
      state.mode === Mode.Editor &&
      currentFile !== undefined &&
      (node.item.id === currentFile.id || ctrl.tree.isDescendant(currentFile.id, node.tree)) &&
      node.item.parentId
    ) {
      await ctrl.editor.openFile(node.item.parentId)
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

  const onDeleteForever = async () => {
    const node = unwrap(selected())
    if (!node) return
    if (isFile(node.item)) {
      await ctrl.file.deleteForever(node.item.id)
    } else {
      await ctrl.canvas.deleteForever(node.item.id)
    }
    closeTooltip()
  }

  const onRestore = async () => {
    const node = unwrap(selected())
    if (!node) return
    if (isFile(node.item)) {
      await ctrl.file.restore(node.item.id)
    } else {
      await ctrl.canvas.restore(node.item.id)
    }

    closeTooltip()
  }

  const onFocus = async () => {
    const id = selected()?.item.id
    if (!id) return
    props.maybeHide?.()
    await ctrl.canvas.focus(id)
    closeTooltip()
  }

  const isOnCanvas = (item?: TreeNodeItem): boolean =>
    state.mode === Mode.Canvas &&
    isFile(item) &&
    (ctrl.canvas.currentCanvas?.elements.some((it) => it.id === item.id) ?? false)

  onMount(() => {
    ctrl.tree.create()
  })

  const TreeLink = (p: {node: TreeNode; level: number; selected?: boolean}) => {
    let ref!: HTMLSpanElement
    let anchor!: HTMLElement

    const [title, setTitle] = createSignal<string>()

    const onClick = async () => {
      if (isCodeFile(p.node.item) ) {
        await ctrl.code.openFile(p.node.item.id)
      } else if (isFile(p.node.item) ) {
        await ctrl.editor.openFile(p.node.item.id)
      } else {
        await ctrl.canvas.open(p.node.item.id)
      }

      props.maybeHide?.()
    }

    const onCornerClick = () =>
      ctrl.tree.collapse(p.node)

    const getCurrentId = () =>
      state.mode === Mode.Canvas ?
        ctrl.canvas.currentCanvas?.id :
        ctrl.file.currentFile?.id

    onMount(() => {
      const offset = 10
      const gesture = new DragGesture(ref, async ({xy: [x, y], last, first, event}) => {
        event.preventDefault()
        let el = document.elementFromPoint(x, y) as HTMLElement
        if (el?.tagName === 'SPAN') el = el.parentNode as HTMLElement
        const box = el?.getBoundingClientRect()
        const targetId = el?.dataset.id

        if (first) {
          setGrabbing(true)
          setTooltipAnchor(undefined)
          ghostRef.textContent = title() ?? ''
          ghostRef.style.display = 'block'
        }

        if (ghostRef) {
          ghostRef.style.top = `${y}px`
          ghostRef.style.left = `${x}px`
        }

        if (targetId && targetId !== p.node.item.id && !ctrl.tree.isDescendant(targetId, p.node.tree)) {
          if (y < box.top + offset) {
            setDropState({pos: 'before', targetId})
          } else if (y > box.bottom - offset) {
            setDropState({pos: 'after', targetId})
          } else {
            setDropState({pos: 'add', targetId})
          }
        } else if (el?.closest('#grid')) {
          setDropState({pos: 'open'})
        } else if (el === binRef) {
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
                await ctrl.tree.add(p.node, targetNode)
              } else if (ds.pos === 'before') {
                await ctrl.tree.before(p.node, targetNode)
              } else if (ds.pos === 'after') {
                await ctrl.tree.after(p.node, targetNode)
              }
            }
          } else if (ds?.pos === 'delete') {
            await deleteNode(p.node)
          } else if (ds?.pos === 'open') {
            if (state.mode === Mode.Canvas && isFile(p.node.item)) {
              const point = ctrl.canvas.getPosition([x, y])
              await ctrl.canvas.addFile(p.node.item, undefined, point)
            }
          }

          setDropState(undefined)
          setGrabbing(false)
          ghostRef.style.display = 'none'
        }
      }, {
        filterTaps: true,
        eventOptions: {passive: false},
      })

      onCleanup(() => {
        gesture.destroy()
      })
    })

    createEffect(async () => {
      if (isFile(p.node.item)) {
        setTitle(await ctrl.file.getTitle(p.node.item))
      } else {
        setTitle(p.node.item.title ?? 'Canvas')
      }
    })

    return (
      <Text
        data-id={p.node.item.id}
        data-testid="tree_link"
        class={css`
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          align-items: flex-start;
          ${props.showDeleted && !p.node.item.deleted ? `
            opacity: 0.3;
            pointer-events: none;
          `: ''}
          ${p.node.item.id === getCurrentId() ? `
            font-weight: bold;
            font-family: var(--menu-font-family-bold);
            color: var(--primary-background);
          ` : ''}
          ${p.selected ? `
            background: var(--primary-background-10);
          ` : ''}
          &:hover {
            color: var(--primary-background);
            background: var(--foreground-10);
            border-radius: var(--border-radius);
            > span {
              opacity: 1;
            }
          }
        `}
      >
        <TreeLinkCorner
          onClick={onCornerClick}
          expandable={p.node.tree.length > 0}
          level={p.level}
          highlight={ctrl.tree.isCollapsed(p.node)}
        >
          <Switch>
            <Match when={isCanvas(p.node.item)}><Icon>gesture</Icon></Match>
            <Match when={isCodeFile(p.node.item)}><Icon>code_blocks</Icon></Match>
            <Match when={!isCodeFile(p.node.item)}><Icon>text_snippet</Icon></Match>
          </Switch>
        </TreeLinkCorner>
        <TreeLinkTitle
          ref={ref}
          onClick={onClick}
          grabbing={grabbing()}
          highlight={isOnCanvas(p.node.item)}
          data-testid="tree_link_title"
        >
          {title()}
        </TreeLinkTitle>
        <LinkMenu
          ref={anchor}
          selected={selected() === p.node}
          onClick={(e: MouseEvent) => showTooltip(e, anchor, p.node)}
          data-testid="tree_link_menu">
          <Icon>more_horiz</Icon>
        </LinkMenu>
      </Text>
    )
  }

  const Tree = (p: {tree: TreeNode[]; level: number; selected?: boolean}) => {
    return (
      <For each={p.tree}>
        {(node) => (
          <Show when={props.showDeleted || !node.item.deleted}>
            <Show when={isNode(node) && dropState()?.pos === 'before'}>
              <DropLine level={p.level} />
            </Show>
            <TreeLink
              node={node}
              selected={p.selected || (isNode(node) && dropState()?.pos === 'add' && isFile(node.item))}
              level={p.level}
            />
            <Show when={node.tree.length > 0 && !ctrl.tree.isCollapsed(node)}>
              <Tree
                tree={node.tree}
                level={p.level + 1}
                selected={p.selected || (isNode(node) && dropState()?.pos === 'add')}
              />
            </Show>
            <Show when={isNode(node) && dropState()?.pos === 'after'}>
              <DropLine level={p.level} />
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
        <Show when={!props.showDeleted}>
          <Link
            ref={binRef}
            onClick={props.onBin}
            data-testid="bin"
            class={dropState()?.pos === 'delete' ? css`
              background: var(--primary-background-20);
              border-radius: var(--border-radius);
            ` : undefined}
          >
            <TreeLinkCorner><Icon>delete</Icon></TreeLinkCorner> Bin
          </Link>
        </Show>
      </Sub>
      <Portal mount={document.getElementById('container') ?? undefined}>
        <Show when={grabbing()}>
          <GhostContainer>
            <Ghost ref={ghostRef} />
          </GhostContainer>
        </Show>
        <Show when={dropState()?.pos === 'open'}>
          <HighlightContent />
        </Show>
      </Portal>
      <Show when={tooltipAnchor() !== undefined}>
        <Tooltip anchor={tooltipAnchor()!} onClose={() => closeTooltip()}>
          <div onClick={onRename} data-testid="rename">
            <Icon>edit</Icon>
            Rename
          </div>
          <Show when={isOnCanvas(selected()?.item)}>
            <div onClick={onFocus} data-testid="focus_file">
              <Icon>adjust</Icon>
              Focus file
            </div>
          </Show>
          <Show when={!selected()?.item.deleted && isFile(selected()?.item)}>
            <div onClick={onAddFile} data-testid="add_file">
              <Icon>post_add</Icon>
              Add file
            </div>
            <div onClick={onAddCanvas} data-testid="add_canvas">
              <Icon>gesture</Icon>
              Add canvas
            </div>
            <div onClick={onAddCode} data-testid="add_code">
              <Icon>code_blocks</Icon>
              Add code file
            </div>
            <hr class="divider" />
          </Show>
          <Show when={selected()?.item.deleted}>
            <div onClick={onRestore} data-testid="restore">
              <Icon>restore_page</Icon>
              Restore
            </div>
            <div onClick={onDeleteForever} data-testid="delete_forever">
              <Icon>delete_forever</Icon>
              Delete forever
            </div>
          </Show>
          <Show when={!selected()?.item.deleted}>
            <div onClick={onDelete} data-testid="delete">
              <Icon>delete</Icon>
              Delete
            </div>
          </Show>
        </Tooltip>
      </Show>
    </>
  )
}
