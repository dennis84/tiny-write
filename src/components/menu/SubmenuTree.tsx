import {For, Match, Show, Switch, createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {Portal} from 'solid-js/web'
import {unwrap} from 'solid-js/store'
import {styled} from 'solid-styled-components'
import {DragGesture} from '@use-gesture/vanilla'
import {isCanvas, isCodeFile, isFile, isLocalFile, Page, useState} from '@/state'
import {useOpen} from '@/hooks/open'
import type {MenuTreeItem} from '@/services/TreeService'
import {FileService} from '@/services/FileService'
import {CanvasService} from '@/services/CanvasService'
import {ITEM_HEIGHT, itemCss, Label, Link, Sub} from './Style'
import {Tooltip, TooltipButton, TooltipDivider} from '../Tooltip'
import {
  IconAdd,
  IconAdjust,
  IconCodeBlocks,
  IconDelete,
  IconGesture,
  IconMoreHoriz,
  IconPostAdd,
  IconEdit,
  IconTextSnippet,
  IconHistory,
  IconDeleteForever,
  LangIcon,
} from '../Icon'

const HighlightContent = styled('div')`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
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

// biome-ignore format: ternary breaks ugly
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
    border-radius: var(--border-radius-small);
  ` : ''}
  &:hover {
    color: var(--primary-background);
    background: var(--foreground-10);
    border-radius: var(--border-radius-small);
    > span {
      opacity: 1;
    }
  }
`

// biome-ignore format: ternary breaks ugly
const TreeLinkCorner = styled('i')`
  margin-right: 10px;
  cursor: var(--cursor-pointer);
  font-family: monospace;
  font-weight: normal;
  font-style: normal;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--foreground-50);
  height: ${ITEM_HEIGHT};
  ${(props: any) => (props.highlight ? `color: var(--primary-background);` : '')}
  ${(props: any) => (props.level ? `margin-left: ${String(20 * props.level)}px;` : '')}
  ${(props: any) => props.expandable ? `
    &:hover {
      background: var(--foreground-10);
      border-radius: var(--border-radius-small);
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

// biome-ignore format: ternary breaks ugly
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
    inputLineService,
    canvasService,
    canvasCollabService,
    codeService,
    deleteService,
    fileService,
    treeService,
  } = useState()
  const [dropState, setDropState] = createSignal<DropState>()
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement | undefined>()
  const [selected, setSelected] = createSignal<MenuTreeItem>()
  const [grabbing, setGrabbing] = createSignal(false)
  const {open} = useOpen()

  const isNode = (node: MenuTreeItem) => dropState()?.targetId === node.id

  const closeTooltip = () => {
    setTooltipAnchor(undefined)
    setSelected(undefined)
  }

  const showTooltip = (e: MouseEvent, anchor: HTMLElement, node: MenuTreeItem) => {
    e.stopPropagation()
    setTooltipAnchor(anchor)
    setSelected(node)
  }

  const onRename = async (e: MouseEvent) => {
    e.stopPropagation() // prevent bubble to drawer onClick

    const item = selected()?.value
    if (!item) return

    closeTooltip()
    inputLineService.setInputLine({
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
    await treeService.add(file)
    open(file)
    closeTooltip()
    props.maybeHide?.()
  }

  const onNewCanvas = async () => {
    const canvas = await canvasService.newCanvas()
    await treeService.add(canvas)
    open(canvas)
    closeTooltip()
    props.maybeHide?.()
  }

  const onNewCode = async () => {
    const file = await codeService.newFile()
    await treeService.add(file)
    open(file)
    closeTooltip()
    props.maybeHide?.()
  }

  const onAddFile = async () => {
    const target = unwrap(selected())
    if (!target) return
    const file = await fileService.newFile({parentId: target.id})
    await treeService.add(file)
    if (treeService.isCollapsed(target.id)) {
      await treeService.collapse(target.id)
    }

    open(file)
    closeTooltip()
  }

  const onAddCanvas = async () => {
    const target = unwrap(selected())
    if (!target) return
    const canvas = await canvasService.newCanvas({parentId: target.id})
    await treeService.add(canvas)
    open(canvas)
    closeTooltip()
  }

  const onAddCode = async () => {
    const target = unwrap(selected())
    if (!target) return
    const file = await codeService.newFile({parentId: target.id})
    await treeService.add(file)
    open(file)
    closeTooltip()
  }

  const onDelete = async () => {
    const node = unwrap(selected())
    if (!node) return
    const result = await deleteService.delete(node)
    treeService.remove(node.id)
    open(result.navigateTo)
    closeTooltip()
  }

  const onDeleteForever = async () => {
    const node = unwrap(selected())
    if (!node) return
    const result = await deleteService.delete(node, true)
    treeService.remove(node.id)
    open(result.navigateTo)
    closeTooltip()
  }

  const onRestore = async () => {
    const node = unwrap(selected())
    if (!node) return
    if (isFile(node.value)) {
      await fileService.restore(node.id)
    } else {
      await canvasService.restore(node.id)
    }

    treeService.updateValue(node.value)

    closeTooltip()
  }

  const onFocus = async () => {
    const id = selected()?.id
    if (!id) return
    props.maybeHide?.()
    await canvasService.focus(id)
    closeTooltip()
  }

  const isOnCanvas = (item?: MenuTreeItem): boolean =>
    store.lastLocation?.page === Page.Canvas &&
    isFile(item?.value) &&
    (canvasService.currentCanvas?.elements.some((it) => it.id === item.id) ?? false)

  const TreeLink = (p: {node: MenuTreeItem; level: number; selected?: boolean}) => {
    let ref!: HTMLSpanElement
    let anchor!: HTMLElement

    const [title, setTitle] = createSignal<string>()

    const onClick = async () => {
      open(p.node.value)
      props.maybeHide?.()
    }

    const onCornerClick = () => treeService.collapse(p.node.id)

    const getCurrentId = () =>
      store.lastLocation?.page === Page.Canvas
        ? canvasService.currentCanvas?.id
        : fileService.currentFile?.id

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
            targetId !== p.node.id &&
            !treeService.isDescendant(targetId, p.node.id)
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
              const targetNode = treeService.getItem(ds.targetId)
              if (targetNode) {
                if (ds.pos === 'add' && isFile(targetNode.value)) {
                  await treeService.move(p.node.id, targetNode.id)
                } else if (ds.pos === 'before') {
                  await treeService.before(p.node.id, targetNode.id)
                } else if (ds.pos === 'after') {
                  await treeService.after(p.node.id, targetNode.id)
                }
              }
            } else if (ds?.pos === 'delete') {
              await deleteService.delete(p.node)
            } else if (ds?.pos === 'open') {
              if (store.lastLocation?.page === Page.Canvas && isFile(p.node.value)) {
                const point = canvasService.getPosition([x, y])
                const added = await canvasService.addFile(p.node.value, undefined, point)
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
      if (isFile(p.node.value)) {
        const file = fileService.findFileById(p.node.id)
        setTitle(await fileService.getTitle(file))
      } else {
        setTitle(p.node.value.title ?? 'Canvas')
      }
    })

    return (
      <TreeLinkItem
        deleted={props.showDeleted && !p.node.value.deleted}
        active={p.node.value.id === getCurrentId()}
        selected={p.selected || anchor === tooltipAnchor()}
        data-id={p.node.value.id}
        data-testid="tree_link"
      >
        <TreeLinkCorner
          onClick={onCornerClick}
          expandable={p.node.childrenIds.length > 0}
          level={p.level}
          highlight={treeService.isCollapsed(p.node.id)}
        >
          <Switch>
            <Match when={isCanvas(p.node.value)}>
              <IconGesture />
            </Match>
            <Match when={isCodeFile(p.node.value)}>
              <Show
                when={
                  isFile(p.node.value) &&
                  (p.node.value.codeLang || !p.node.value.codeLang) /* eslint-disable-line */
                }
                keyed
              >
                <LangIcon name={isFile(p.node.value) ? p.node.value.codeLang : undefined} />
              </Show>
            </Match>
            <Match when={!isCodeFile(p.node.value)}>
              <IconTextSnippet />
            </Match>
          </Switch>
        </TreeLinkCorner>
        <TreeLinkTitle
          ref={ref}
          onClick={onClick}
          grabbing={grabbing()}
          highlight={isOnCanvas(p.node)}
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
          <IconMoreHoriz />
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
        <IconAdd /> New
      </Link>
    )
  }

  const TreeItem = (p: {id: string; level: number; selected?: boolean}) => (
    <Show when={treeService.getItem(p.id)}>
      {(item) => (
        <Show when={props.showDeleted || !item().value.deleted}>
          <Show when={isNode(item()) && dropState()?.pos === 'before'}>
            <DropLine level={p.level} />
          </Show>
          <TreeLink
            node={item()}
            selected={
              p.selected || (isNode(item()) && dropState()?.pos === 'add' && isFile(item().value))
            }
            level={p.level}
          />
          <Show when={item().childrenIds.length > 0 && !treeService.isCollapsed(item().id)}>
            <Tree
              childrenIds={item().childrenIds}
              level={p.level + 1}
              selected={p.selected || (isNode(item()) && dropState()?.pos === 'add')}
            />
          </Show>
          <Show when={isNode(item()) && dropState()?.pos === 'after'}>
            <DropLine level={p.level} />
          </Show>
        </Show>
      )}
    </Show>
  )

  const Tree = (p: {childrenIds: string[]; level: number; selected?: boolean}) => (
    <For each={p.childrenIds}>
      {(id) => <TreeItem id={id} level={p.level} selected={p.selected} />}
    </For>
  )

  onMount(() => {
    treeService.updateAll()
  })

  return (
    <>
      <Label>Storage</Label>
      <Sub data-tauri-drag-region="true">
        <Tree childrenIds={treeService.tree.rootItemIds} level={0} />
        <Show when={!props.showDeleted}>
          <NewLink />
          <Link
            ref={binRef}
            onClick={props.onBin}
            data-testid="bin"
            active={dropState()?.pos === 'delete'}
          >
            <IconDelete /> Bin
          </Link>
        </Show>
      </Sub>
      <Show when={grabbing()}>
        <Portal mount={document.getElementById('container') ?? undefined}>
          <GhostContainer>
            <Ghost ref={ghostRef} />
          </GhostContainer>
        </Portal>
      </Show>
      <Show when={dropState()?.pos === 'open'}>
        <Portal mount={document.getElementById('content') ?? undefined}>
          <HighlightContent />
        </Portal>
      </Show>
      <Show when={tooltipAnchor() !== undefined}>
        <Tooltip anchor={tooltipAnchor()!} onClose={() => closeTooltip()} backdrop={true}>
          <Show when={isOnCanvas(selected())}>
            <TooltipButton onClick={onFocus} data-testid="focus_file">
              <IconAdjust />
              Focus file
            </TooltipButton>
            <TooltipDivider />
          </Show>
          <Show when={!selected()?.value.deleted && isFile(selected()?.value)}>
            <TooltipButton onClick={onAddFile} data-testid="add_file">
              <IconPostAdd />
              Add file
            </TooltipButton>
            <TooltipButton onClick={onAddCanvas} data-testid="add_canvas">
              <IconGesture />
              Add canvas
            </TooltipButton>
            <TooltipButton onClick={onAddCode} data-testid="add_code">
              <IconCodeBlocks />
              Add code file
            </TooltipButton>
            <TooltipDivider />
          </Show>
          <Show when={selected() && !isLocalFile(selected())}>
            <TooltipButton onClick={onRename} data-testid="rename">
              <IconEdit />
              Rename
            </TooltipButton>
          </Show>
          <Show when={selected()?.value.deleted}>
            <TooltipButton onClick={onRestore} data-testid="restore">
              <IconHistory />
              Restore
            </TooltipButton>
            <TooltipButton onClick={onDeleteForever} data-testid="delete_forever">
              <IconDeleteForever />
              Delete forever
            </TooltipButton>
          </Show>
          <Show when={selected() && !selected()?.value.deleted && !isLocalFile(selected()?.value)}>
            <TooltipButton onClick={onDelete} data-testid="delete">
              <IconDelete />
              Delete
            </TooltipButton>
          </Show>
          <Show when={selected() && isLocalFile(selected()?.value)}>
            <TooltipButton onClick={onDeleteForever} data-testid="delete">
              <IconDelete />
              Close
            </TooltipButton>
          </Show>
          <Show when={!selected()}>
            <TooltipButton onClick={onNewFile} data-testid="new_file">
              <IconPostAdd />
              New file
            </TooltipButton>
            <TooltipButton onClick={onNewCanvas} data-testid="new_canvas">
              <IconGesture />
              New canvas
            </TooltipButton>
            <TooltipButton onClick={onNewCode} data-testid="new_code">
              <IconCodeBlocks />
              New code file
            </TooltipButton>
          </Show>
        </Tooltip>
      </Show>
    </>
  )
}
