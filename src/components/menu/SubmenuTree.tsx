import {For, Match, Show, Switch, createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {Portal} from 'solid-js/web'
import {unwrap} from 'solid-js/store'
import {styled} from 'solid-styled-components'
import {DragGesture} from '@use-gesture/vanilla'
import {Mode, isCanvas, isCodeFile, isFile, isLocalFile, useState} from '@/state'
import {useOpen} from '@/open'
import {TreeNode, TreeNodeItem} from '@/services/TreeService'
import {FileService} from '@/services/FileService'
import {CanvasService} from '@/services/CanvasService'
import {ITEM_HEIGHT, itemCss, Label, Link, Sub} from './Style'
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

// prettier-ignore
const TreeLinkItem = styled('div')`
  ${itemCss}
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  align-items: start;
  ${(props: any) => props.deleted ? `
    opacity: 0.3;
    pointer-events: none;
  ` : ''}
  ${(props: any) => props.active ? `
    font-weight: bold;
    font-family: var(--menu-font-family-bold);
    color: var(--primary-background);
  ` : ''}
  ${(props: any) => props.selected ? `
    background: var(--primary-background-10);
    border-radius: var(--border-radius);
  ` : ''}
  &:hover {
    color: var(--primary-background);
    background: var(--foreground-10);
    border-radius: var(--border-radius);
    > span {
      opacity: 1;
    }
  }
`

// prettier-ignore
const TreeLinkCorner = styled('i')`
  margin-right: 5px;
  cursor: var(--cursor-pointer);
  font-family: monospace;
  font-weight: normal;
  font-style: normal;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--foreground-50);
  height: ${ITEM_HEIGHT};
  width: ${ITEM_HEIGHT};
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
  word-break: break-all;
  ${(props: any) => (props.highlight ? `color: var(--primary-background-80);` : '')}
  ${(props: any) => (props.grabbing ? 'cursor: var(--cursor-grabbed);' : '')}
`

// prettier-ignore
const LinkMenu = styled('span')`
  justify-self: flex-end;
  display: flex;
  align-items: center;
  justify-content: center;
  height: ${ITEM_HEIGHT};
  width: ${ITEM_HEIGHT};
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
    .icon {
      font-weight: bold;
    }
  }
`

interface DropState {
  targetId?: string
  pos: 'before' | 'after' | 'add' | 'open' | 'delete'
}

interface Props {
  onBin?: () => void
  maybeHide?: () => void
  showDeleted?: boolean
}

export const SubmenuTree = (props: Props) => {
  let ghostRef!: HTMLDivElement
  let binRef!: HTMLButtonElement

  const {
    store,
    appService,
    canvasService,
    canvasCollabService,
    codeService,
    deleteService,
    fileService,
    treeService,
  } = useState()
  const [dropState, setDropState] = createSignal<DropState>()
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement | undefined>()
  const [selected, setSelected] = createSignal<TreeNode>()
  const [grabbing, setGrabbing] = createSignal(false)
  const {open} = useOpen()

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
    appService.setInputLine({
      value: item?.title ?? '',
      onEnter: (value: string) => {
        const title = value.trim() || undefined
        if (isFile(item)) {
          fileService.updateFile(item.id, {title})
          FileService.saveFile(item)
        } else {
          canvasService.updateCanvas(item.id, {title})
          CanvasService.saveCanvas(item)
        }
      },
    })
  }

  const onNewFile = async () => {
    const file = await fileService.newFile()
    open(file)
    treeService.create()
    closeTooltip()
    props.maybeHide?.()
  }

  const onNewCanvas = async () => {
    const canvas = await canvasService.newCanvas()
    open(canvas)
    treeService.create()
    closeTooltip()
    props.maybeHide?.()
  }

  const onNewCode = async () => {
    const file = await codeService.newFile()
    open(file)
    treeService.create()
    closeTooltip()
    props.maybeHide?.()
  }

  const onAddFile = async () => {
    const target = unwrap(selected())
    if (!target) return
    const file = await fileService.newFile()
    await treeService.add({item: file, tree: []}, target)
    if (treeService.isCollapsed(target)) {
      await treeService.collapse(target)
    }

    open(file)
    closeTooltip()
  }

  const onAddCanvas = async () => {
    const target = unwrap(selected())
    if (!target) return
    const canvas = await canvasService.newCanvas()
    await treeService.add({item: canvas, tree: []}, target)
    open(canvas)
    closeTooltip()
  }

  const onAddCode = async () => {
    const target = unwrap(selected())
    if (!target) return
    const file = await codeService.newFile()
    await treeService.add({item: file, tree: []}, target)
    open(file)
    closeTooltip()
  }

  const onDelete = async () => {
    const node = unwrap(selected())
    if (!node) return
    const result = await deleteService.delete(node)
    open(result.navigateTo)
    closeTooltip()
  }

  const onDeleteForever = async () => {
    const node = unwrap(selected())
    if (!node) return
    const result = await deleteService.delete(node, true)
    open(result.navigateTo)
    closeTooltip()
  }

  const onRestore = async () => {
    const node = unwrap(selected())
    if (!node) return
    if (isFile(node.item)) {
      await fileService.restore(node.item.id)
    } else {
      await canvasService.restore(node.item.id)
    }

    closeTooltip()
  }

  const onFocus = async () => {
    const id = selected()?.item.id
    if (!id) return
    props.maybeHide?.()
    await canvasService.focus(id)
    closeTooltip()
  }

  const isOnCanvas = (item?: TreeNodeItem): boolean =>
    store.mode === Mode.Canvas &&
    isFile(item) &&
    (canvasService.currentCanvas?.elements.some((it) => it.id === item.id) ?? false)

  onMount(() => {
    treeService.create()
  })

  const TreeLink = (p: {node: TreeNode; level: number; selected?: boolean}) => {
    let ref!: HTMLSpanElement
    let anchor!: HTMLElement

    const [title, setTitle] = createSignal<string>()

    const onClick = async () => {
      open(p.node.item)
      props.maybeHide?.()
    }

    const onCornerClick = () => treeService.collapse(p.node)

    const getCurrentId = () =>
      store.mode === Mode.Canvas ? canvasService.currentCanvas?.id : fileService.currentFile?.id

    onMount(() => {
      const offset = 10
      const gesture = new DragGesture(
        ref,
        async ({xy: [x, y], last, first, event}) => {
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

          if (
            targetId &&
            targetId !== p.node.item.id &&
            !treeService.isDescendant(targetId, p.node.tree)
          ) {
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
              const targetNode = treeService.findTreeNode(ds.targetId)
              if (targetNode) {
                if (ds.pos === 'add' && isFile(targetNode.item)) {
                  await treeService.add(p.node, targetNode)
                } else if (ds.pos === 'before') {
                  await treeService.before(p.node, targetNode)
                } else if (ds.pos === 'after') {
                  await treeService.after(p.node, targetNode)
                }
              }
            } else if (ds?.pos === 'delete') {
              await deleteService.delete(p.node)
            } else if (ds?.pos === 'open') {
              if (store.mode === Mode.Canvas && isFile(p.node.item)) {
                const point = canvasService.getPosition([x, y])
                const added = await canvasService.addFile(p.node.item, undefined, point)
                canvasCollabService.addElements(added ?? [])
              }
            }

            setDropState(undefined)
            setGrabbing(false)
            ghostRef.style.display = 'none'
          }
        },
        {
          filterTaps: true,
          eventOptions: {passive: false},
        },
      )

      onCleanup(() => {
        gesture.destroy()
      })
    })

    createEffect(async () => {
      if (isFile(p.node.item)) {
        setTitle(await fileService.getTitle(p.node.item))
      } else {
        setTitle(p.node.item.title ?? 'Canvas')
      }
    })

    return (
      <TreeLinkItem
        deleted={props.showDeleted && !p.node.item.deleted}
        active={p.node.item.id === getCurrentId()}
        selected={p.selected || anchor === tooltipAnchor()}
        data-id={p.node.item.id}
        data-testid="tree_link"
      >
        <TreeLinkCorner
          onClick={onCornerClick}
          expandable={p.node.tree.length > 0}
          level={p.level}
          highlight={treeService.isCollapsed(p.node)}
        >
          <Switch>
            <Match when={isCanvas(p.node.item)}>
              <Icon>gesture</Icon>
            </Match>
            <Match when={isCodeFile(p.node.item)}>
              <Icon>code_blocks</Icon>
            </Match>
            <Match when={!isCodeFile(p.node.item)}>
              <Icon>text_snippet</Icon>
            </Match>
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
          data-testid="tree_link_menu"
        >
          <Icon>more_horiz</Icon>
        </LinkMenu>
      </TreeLinkItem>
    )
  }

  const NewLink = () => {
    let anchor!: HTMLButtonElement
    const onNew = (e: MouseEvent) => {
      e.stopPropagation()
      setTooltipAnchor(anchor)
    }

    return (
      <Link ref={anchor} active={anchor === tooltipAnchor()} onClick={onNew} data-testid="new">
        <Icon>add</Icon> New
      </Link>
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
              selected={
                p.selected || (isNode(node) && dropState()?.pos === 'add' && isFile(node.item))
              }
              level={p.level}
            />
            <Show when={node.tree.length > 0 && !treeService.isCollapsed(node)}>
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
        <Tree tree={treeService.tree} level={0} />
        <Show when={!props.showDeleted}>
          <NewLink />
          <Link
            ref={binRef}
            onClick={props.onBin}
            data-testid="bin"
            active={dropState()?.pos === 'delete'}
          >
            <TreeLinkCorner>
              <Icon>delete</Icon>
            </TreeLinkCorner>{' '}
            Bin
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
        <Tooltip anchor={tooltipAnchor()!} onClose={() => closeTooltip()} backdrop={true}>
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
          <Show when={selected() && !isLocalFile(selected()?.item)}>
            <div onClick={onRename} data-testid="rename">
              <Icon>edit</Icon>
              Rename
            </div>
          </Show>
          <Show when={selected()?.item.deleted}>
            <div onClick={onRestore} data-testid="restore">
              <Icon>history</Icon>
              Restore
            </div>
            <div onClick={onDeleteForever} data-testid="delete_forever">
              <Icon>delete_forever</Icon>
              Delete forever
            </div>
          </Show>
          <Show when={selected() && !selected()?.item.deleted && !isLocalFile(selected()?.item)}>
            <div onClick={onDelete} data-testid="delete">
              <Icon>delete</Icon>
              Delete
            </div>
          </Show>
          <Show when={selected() && isLocalFile(selected()?.item)}>
            <div onClick={onDeleteForever} data-testid="delete">
              <Icon>delete</Icon>
              Close
            </div>
          </Show>
          <Show when={!selected()}>
            <div onClick={onNewFile} data-testid="new_file">
              <Icon>post_add</Icon>
              New file
            </div>
            <div onClick={onNewCanvas} data-testid="new_canvas">
              <Icon>gesture</Icon>
              New canvas
            </div>
            <div onClick={onNewCode} data-testid="new_code">
              <Icon>code_blocks</Icon>
              New code file
            </div>
          </Show>
        </Tooltip>
      </Show>
    </>
  )
}
