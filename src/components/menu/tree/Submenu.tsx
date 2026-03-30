import {DragGesture} from '@use-gesture/vanilla'
import {createSignal, For, Match, onCleanup, onMount, Show, Suspense, Switch} from 'solid-js'
import {Portal} from 'solid-js/web'
import {useDialog} from '@/hooks/use-dialog'
import {useTitle} from '@/hooks/use-title'
import {CanvasService} from '@/services/CanvasService'
import {FileService} from '@/services/FileService'
import type {MenuTreeItem} from '@/services/TreeService'
import {isCanvas, isCodeFile, isFile, isProject, useState} from '@/state'
import {Page} from '@/types'
import {IconCanvas, IconFileText, IconFolderRoot} from '../../icons/File'
import {LangIcon} from '../../icons/LangIcon'
import {IconAdd, IconDelete, IconMoreHoriz} from '../../icons/Ui'
import {Link} from '../Link'
import {Label, Sub} from '../Style'
import {
  DropLine,
  Ghost,
  GhostContainer,
  HighlightContent,
  LinkMenu,
  TreeLinkCorner,
  TreeLinkItem,
  TreeLinkTitle,
} from './Style'
import {Tooltip} from './Tooltip'

interface DropState {
  targetId?: string
  pos: 'before' | 'after' | 'add' | 'open' | 'delete'
}

interface Props {
  onBin?: () => void
  showDeleted?: boolean
}

export const Submenu = (props: Props) => {
  let ghostRef!: HTMLDivElement
  let binRef!: HTMLButtonElement

  const {
    locationService,
    canvasService,
    canvasCollabService,
    deleteService,
    fileService,
    projectService,
    treeService,
  } = useState()
  const [dropState, setDropState] = createSignal<DropState>()
  const [selected, setSelected] = createSignal<MenuTreeItem>()
  const [grabbing, setGrabbing] = createSignal(false)

  const isNode = (node: MenuTreeItem) => dropState()?.targetId === node.id

  const showLinkMenu = (e: MouseEvent, anchor: HTMLElement, node: MenuTreeItem) => {
    e.stopPropagation()
    showTooltip({anchor, state: {selected: node}})
    setSelected(node)
  }

  const updateItems = async (items: MenuTreeItem[]) => {
    for (const item of items) {
      const {parentId, leftId} = item
      if (isFile(item.value)) {
        fileService.updateFile(item.id, {leftId, parentId})
        await FileService.saveFile({...item.value, leftId, parentId})
      } else if (isCanvas(item.value)) {
        canvasService.updateCanvas(item.id, {leftId, parentId})
        await CanvasService.saveCanvas({...item.value, leftId, parentId})
      } else if (isProject(item.value)) {
        await projectService.updateProject(item.id, {leftId})
      }
    }
  }

  const TreeLink = (p: {node: MenuTreeItem; level: number; selected?: boolean}) => {
    let ref!: HTMLSpanElement
    let anchor!: HTMLElement

    const title = useTitle({item: p.node.value})

    const onClick = async () => {
      if (!isProject(p.node.value)) locationService.openItem(p.node.value)
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

          if (treeService.isMoveAllowed(p.node.id, targetId)) {
            if (y < box.top + offset) {
              setDropState({pos: 'before', targetId})
            } else if (y > box.bottom - offset) {
              setDropState({pos: 'after', targetId})
            } else if (!isProject(p.node.value)) {
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
                if (ds.pos === 'add') {
                  const affected = treeService.move(p.node.id, targetNode.id)
                  await updateItems(affected)
                } else if (ds.pos === 'before') {
                  const affected = treeService.before(p.node.id, targetNode.id)
                  await updateItems(affected)
                } else if (ds.pos === 'after') {
                  const affected = treeService.after(p.node.id, targetNode.id)
                  await updateItems(affected)
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
            <Match when={isFile(p.node.value)}>
              <IconFileText />
            </Match>
            <Match when={isProject(p.node.value)}>
              <IconFolderRoot />
            </Match>
          </Switch>
        </TreeLinkCorner>
        <TreeLinkTitle
          ref={ref}
          onClick={onClick}
          grabbing={grabbing()}
          highlight={canvasService.isOnCanvas(p.node.id)}
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
      showTooltip({anchor, state: {selected: undefined}})
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
            selected={p.selected || (isNode(item()) && dropState()?.pos === 'add')}
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
