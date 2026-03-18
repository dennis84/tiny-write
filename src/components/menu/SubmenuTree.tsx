import {DragGesture} from '@use-gesture/vanilla'
import {
  createEffect,
  createSignal,
  For,
  Match,
  onCleanup,
  onMount,
  Show,
  Suspense,
  Switch,
} from 'solid-js'
import {unwrap} from 'solid-js/store'
import {Portal} from 'solid-js/web'
import {styled} from 'solid-styled-components'
import {useConfirmDialog} from '@/hooks/use-confirm-dialog'
import {useDialog} from '@/hooks/use-dialog'
import {useInputLine} from '@/hooks/use-input-line'
import {useTitle} from '@/hooks/use-title'
import {CanvasService} from '@/services/CanvasService'
import type {MenuTreeItem} from '@/services/TreeService'
import {isCanvas, isCodeFile, isFile, isLocalFile, useState} from '@/state'
import {Page} from '@/types'
import {DialogList, TooltipButton, TooltipDivider} from '../dialog/Style'
import {IconCanvas, IconCodeBlocks, IconFilePlus, IconFileText} from '../icons/File'
import {LangIcon} from '../icons/LangIcon'
import {
  IconAdd,
  IconClose,
  IconDelete,
  IconEdit,
  IconFocus,
  IconHistory,
  IconMoreHoriz,
} from '../icons/Ui'
import {Link} from './Link'
import {ITEM_HEIGHT, itemCss, Label, Sub} from './Style'

const HighlightContent = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  border: 10px solid var(--primary-background-50);
  user-select: none;
  pointer-events: none;
`

const GhostContainer = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
`

const Ghost = styled.div`
  position: absolute;
  display: none;
  color: var(--foreground);
  font-size: var(--menu-font-size);
  font-family: var(--menu-font-family);
  width: 400px;
  overflow: hidden;
`

const DropLine = styled.div<{level: number}>`
  position: absolute;
  height: 4px;
  border-radius: 4px;
  width: 100%;
  background: var(--primary-background-50);
  pointer-events: none;
  z-index: 1;
  margin-left: ${(p) => 20 * p.level}px;
`

interface ItemProps {
  deleted?: boolean
  selected?: boolean
  active?: boolean
}

// biome-ignore format: ternary breaks ugly
const TreeLinkItem = styled.div<ItemProps>`
  ${itemCss}
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  align-items: start;
  ${(p) => p.deleted ? `
    opacity: 0.3;
    pointer-events: none;
  ` : ''}
  ${(p) => p.active ? `
    font-weight: bold;
    font-family: var(--menu-font-family-bold);
    color: var(--primary-background);
  ` : ''}
  ${(p) => p.selected ? `
    background: var(--primary-background-10);
    border-radius: var(--border-radius-small);
  ` : ''}
  &:hover {
    color: var(--primary-background);
    background: var(--background-90);
    border-radius: var(--border-radius-small);
    > span {
      opacity: 1;
    }
  }
`

interface CornerProps {
  highlight?: boolean
  level?: number
  expandable?: boolean
}

// biome-ignore format: ternary breaks ugly
const TreeLinkCorner = styled.i<CornerProps>`
  margin-right: 10px;
  cursor: var(--cursor-pointer);
  font-family: monospace;
  font-weight: normal;
  font-style: normal;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--background-50);
  height: ${ITEM_HEIGHT};
  ${(p) => (p.highlight ? `color: var(--primary-background);` : '')}
  ${(p) => (p.level ? `margin-left: ${String(20 * p.level)}px;` : '')}
  ${(p) => p.expandable ? `
    &:hover {
      background: var(--background-90);
      border-radius: var(--border-radius-small);
    }
  ` : ''}
`

interface TitleProps {
  highlight?: boolean
  grabbing?: boolean
}

const TreeLinkTitle = styled.span<TitleProps>`
  cursor: var(--cursor-pointer);
  width: 100%;
  touch-action: none;
  word-break: break-all;
  ${(p) => (p.highlight ? `color: var(--primary-background-80);` : '')}
  ${(p) => (p.grabbing ? 'cursor: var(--cursor-grabbed);' : '')}
`

// biome-ignore format: ternary breaks ugly
const LinkMenu = styled.span<{selected?: boolean}>`
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
  ${(p) => p.selected ? `
    opacity: 1;
    background: var(--background-90);
  ` : ''}
  &:hover {
    background: var(--background-90);
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
  showDeleted?: boolean
}

export const SubmenuTree = (props: Props) => {
  let ghostRef!: HTMLDivElement
  let binRef!: HTMLButtonElement

  const {
    locationService,
    canvasService,
    canvasCollabService,
    codeService,
    deleteService,
    fileService,
    treeService,
  } = useState()
  const [dropState, setDropState] = createSignal<DropState>()
  const [selected, setSelected] = createSignal<MenuTreeItem>()
  const [grabbing, setGrabbing] = createSignal(false)
  const showInputLine = useInputLine()
  const showConfirmDialog = useConfirmDialog()

  const isNode = (node: MenuTreeItem) => dropState()?.targetId === node.id

  const showLinkMenu = (e: MouseEvent, anchor: HTMLElement, node: MenuTreeItem) => {
    e.stopPropagation()
    showTooltip({anchor})
    setSelected(node)
  }

  const onRename = async (e: MouseEvent) => {
    e.stopPropagation() // prevent bubble to drawer onClick

    const item = selected()?.value
    if (!item) return

    closeTooltip()

    if (isFile(item)) {
      const title = await fileService.getFilename(item)
      showInputLine({
        value: title ?? '',
        onEnter: async (value: string) => {
          await fileService.renameFile(item.id, value)
        },
      })
    } else {
      showInputLine({
        value: item?.title ?? '',
        onEnter: async (value: string) => {
          const title = value.trim() || undefined
          canvasService.updateCanvas(item.id, {title})
          await CanvasService.saveCanvas(item)
        },
      })
    }
  }

  const onNewFile = async () => {
    const file = await fileService.newFile()
    await treeService.add(file)
    locationService.openItem(file)
    closeTooltip()
  }

  const onNewCanvas = async () => {
    const canvas = await canvasService.newCanvas()
    await treeService.add(canvas)
    locationService.openItem(canvas)
    closeTooltip()
  }

  const onNewCode = async () => {
    const file = await codeService.newFile()
    await treeService.add(file)
    locationService.openItem(file)
    closeTooltip()
  }

  const onAddFile = async () => {
    const target = unwrap(selected())
    if (!target) return
    const file = await fileService.newFile({parentId: target.id})
    await treeService.add(file)
    if (treeService.isCollapsed(target.id)) {
      await treeService.collapse(target.id)
    }

    locationService.openItem(file)
    closeTooltip()
  }

  const onAddCanvas = async () => {
    const target = unwrap(selected())
    if (!target) return
    const canvas = await canvasService.newCanvas({parentId: target.id})
    await treeService.add(canvas)
    locationService.openItem(canvas)
    closeTooltip()
  }

  const onAddCode = async () => {
    const target = unwrap(selected())
    if (!target) return
    const file = await codeService.newFile({parentId: target.id})
    await treeService.add(file)
    locationService.openItem(file)
    closeTooltip()
  }

  const deleteNode = async (forever = false) => {
    const node = unwrap(selected())
    if (!node) return
    showConfirmDialog({
      title: forever ? 'Delete forever' : 'Delete',
      content: 'Do you want to proceed?',
      onConfirm: async () => {
        const result = await deleteService.delete(node, forever)
        if (result.navigateTo !== false) locationService.openItem(result.navigateTo)
        closeTooltip()
      },
    })
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
    await canvasService.focus(id)
    closeTooltip()
  }

  const isOnCanvas = (item?: MenuTreeItem): boolean =>
    locationService.page === Page.Canvas &&
    isFile(item?.value) &&
    (canvasService.currentCanvas?.elements.some((it) => it.id === item.id) ?? false)

  const TreeLink = (p: {node: MenuTreeItem; level: number; selected?: boolean}) => {
    let ref!: HTMLSpanElement
    let anchor!: HTMLElement

    const title = useTitle({item: p.node.value})

    const onClick = async () => {
      locationService.openItem(p.node.value)
    }

    const onCornerClick = () => treeService.collapse(p.node.id)

    const getCurrentId = () =>
      locationService.page === Page.Canvas
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
            closeTooltip()
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
              if (locationService.page === Page.Canvas && isFile(p.node.value)) {
                const point = canvasService.getPosition([x, y])
                const added = await canvasService.addFile(p.node.value, undefined, point)
                if (added) canvasCollabService.addElements(added)
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

    return (
      <TreeLinkItem
        deleted={props.showDeleted && !p.node.value.deleted}
        active={p.node.value.id === getCurrentId()}
        selected={p.selected || anchor === currentTooltip()?.anchor}
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
              <IconCanvas />
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
              <IconFileText />
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
          <Suspense>{title()}</Suspense>
        </TreeLinkTitle>
        <LinkMenu
          ref={anchor}
          selected={selected() === p.node}
          onClick={(e: MouseEvent) => showLinkMenu(e, anchor, p.node)}
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
      showTooltip({anchor})
    }

    return (
      <Link
        ref={anchor}
        active={anchor && anchor === currentTooltip()?.anchor}
        onClick={onNew}
        data-testid="new"
      >
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

  createEffect(() => {
    if (canvasService.resourceState === 'ready') {
      treeService.updateAll()
    }
  })

  const Tooltip = () => (
    <DialogList>
      <Show when={isOnCanvas(selected())}>
        <TooltipButton onClick={onFocus} data-testid="focus_file">
          <IconFocus />
          Focus file
        </TooltipButton>
        <TooltipDivider />
      </Show>
      <Show when={!selected()?.value.deleted && isFile(selected()?.value)}>
        <TooltipButton onClick={onAddFile} data-testid="add_file">
          <IconFilePlus />
          Add file
        </TooltipButton>
        <TooltipButton onClick={onAddCanvas} data-testid="add_canvas">
          <IconCanvas />
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
      <Switch>
        <Match when={selected()?.value.deleted}>
          <TooltipButton onClick={onRestore} data-testid="restore">
            <IconHistory />
            Restore
          </TooltipButton>
          <TooltipButton onClick={() => deleteNode(true)} data-testid="delete_forever">
            <IconDelete />
            Delete forever
          </TooltipButton>
        </Match>
        <Match when={isLocalFile(selected()?.value)}>
          <TooltipButton onClick={() => deleteNode(true)} data-testid="close">
            <IconClose />
            Close
          </TooltipButton>
        </Match>
        <Match when={selected()}>
          <TooltipButton onClick={() => deleteNode()} data-testid="delete">
            <IconDelete />
            Delete
          </TooltipButton>
        </Match>
      </Switch>
      <Show when={!selected()}>
        <TooltipButton onClick={onNewFile} data-testid="new_file">
          <IconFilePlus />
          New file
        </TooltipButton>
        <TooltipButton onClick={onNewCanvas} data-testid="new_canvas">
          <IconCanvas />
          New canvas
        </TooltipButton>
        <TooltipButton onClick={onNewCode} data-testid="new_code">
          <IconCodeBlocks />
          New code file
        </TooltipButton>
      </Show>
    </DialogList>
  )

  const [showTooltip, closeTooltip, currentTooltip] = useDialog({
    component: Tooltip,
    onClose: () => setSelected(undefined),
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
    </>
  )
}
