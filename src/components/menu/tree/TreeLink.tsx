import {DragGesture} from '@use-gesture/vanilla'
import {createSignal, onCleanup, onMount, Show, Suspense} from 'solid-js'
import {Portal} from 'solid-js/web'
import {useTitle} from '@/hooks/use-title'
import {isCanvas, isDeletable, isDirectory, isFile, isFilename, isProject, useState} from '@/state'
import {type MenuTreeItem, Page} from '@/types'
import {IconMoreHoriz} from '../../icons/Ui'
import {DropLine, Ghost, GhostContainer, TreeLinkItem, TreeLinkMenu, TreeLinkTitle} from './Style'
import {type DropPos, useTreeUi} from './Submenu'
import {TreeLinkIcon} from './TreeLinkIcon'
import {TreeLinkToggle} from './TreeLinkToggle'

interface Props {
  node: MenuTreeItem
  level: number
  dropPos?: DropPos
}

export const TreeLink = (p: Props) => {
  let ghostRef!: HTMLDivElement
  let ref!: HTMLSpanElement
  let anchor!: HTMLButtonElement

  const [grabbing, setGrabbing] = createSignal(false)
  const {
    appService,
    deleteService,
    canvasCollabService,
    fileService,
    projectFileService,
    canvasService,
    projectService,
    locationService,
    treeService,
    treeActionService,
  } = useState()
  const title = useTitle({item: p.node.value})
  const tree = useTreeUi()

  const onToggleClick = async () => {
    if (isFile(p.node.value) || isCanvas(p.node.value)) {
      await treeService.collapse(p.node.id)
      return
    }

    return onClick()
  }

  const onClick = async () => {
    const item = p.node.value
    if (isFilename(item)) {
      const file = await projectFileService.newFileByPath({
        path: item.path,
        projectId: item.projectId,
        lastCursorPos: item.lastCursorPos,
      })

      locationService.openItem(file)
      return
    }

    if (isProject(item) || isDirectory(item)) {
      await projectService.toggleDirectory(item)
      return
    }

    locationService.openItem(item)
  }

  const isActive = (id: string) =>
    id === locationService.canvasId ||
    id === locationService.editorId ||
    id === locationService.codeId ||
    id === fileService.activeFile()

  const showLinkMenu = (e: MouseEvent, anchor: HTMLElement, node: MenuTreeItem) => {
    e.stopPropagation()
    tree.showTooltip({anchor, state: {selected: node}})
  }

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
          tree.closeTooltip()
          ghostRef.textContent = title() ?? ''
          ghostRef.style.display = 'block'
        }

        if (ghostRef) {
          ghostRef.style.top = `${y}px`
          ghostRef.style.left = `${x}px`
        }

        if (treeService.isMoveAllowed(p.node.id, targetId)) {
          if (y < box.top + offset) {
            tree.setDropState({pos: 'before', targetId})
          } else if (y > box.bottom - offset) {
            tree.setDropState({pos: 'after', targetId})
          } else if (!isProject(p.node.value)) {
            tree.setDropState({pos: 'add', targetId})
          }
        } else if (canvasService.canvasRef?.contains(el)) {
          tree.setDropState({pos: 'open'})
        } else if (el === tree.binRef()) {
          tree.setDropState({pos: 'delete'})
        } else {
          tree.setDropState(undefined)
        }

        if (last) {
          const ds = tree.dropState()
          if (ds?.targetId) {
            const targetNode = treeService.getItem(ds.targetId)
            if (targetNode) {
              if (ds.pos === 'add') {
                await treeActionService.move(p.node.id, targetNode.id)
              } else if (ds.pos === 'before') {
                await treeActionService.before(p.node.id, targetNode.id)
              } else if (ds.pos === 'after') {
                await treeActionService.after(p.node.id, targetNode.id)
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

          tree.setDropState(undefined)
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
    <>
      <TreeLinkItem
        deleted={tree.showDeleted && isDeletable(p.node.value) && !p.node.value.deleted}
        active={isActive(p.node.value.id)}
        isOnCanvas={canvasService.isOnCanvas(p.node.id)}
        selected={p.node === tree.currentTooltip()?.state.selected}
        data-id={p.node.value.id}
        data-testid="tree_link"
      >
        <TreeLinkToggle node={p.node} level={p.level} onClick={onToggleClick} />
        <TreeLinkTitle
          ref={ref}
          onClick={onClick}
          grabbing={grabbing()}
          data-testid="tree_link_title"
        >
          <TreeLinkIcon node={p.node} />
          <Suspense>{title()}</Suspense>
        </TreeLinkTitle>
        <TreeLinkMenu
          ref={anchor}
          onClick={(e: MouseEvent) => showLinkMenu(e, anchor, p.node)}
          data-testid="tree_link_menu"
        >
          <IconMoreHoriz />
        </TreeLinkMenu>
        <Show when={p.dropPos === 'before' || p.dropPos === 'after'}>
          <DropLine dropPos={p.dropPos} level={p.level} />
        </Show>
      </TreeLinkItem>
      <Show when={grabbing()}>
        <Portal mount={appService.layoutRef}>
          <GhostContainer>
            <Ghost ref={ghostRef} />
          </GhostContainer>
        </Portal>
      </Show>
    </>
  )
}
