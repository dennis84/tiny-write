import {DragGesture} from '@use-gesture/vanilla'
import {createSignal, Match, onCleanup, onMount, Show, Suspense, Switch} from 'solid-js'
import {Portal} from 'solid-js/web'
import {useTitle} from '@/hooks/use-title'
import {CanvasService} from '@/services/CanvasService'
import {FileService} from '@/services/FileService'
import type {MenuTreeItem} from '@/services/TreeService'
import {isCanvas, isCodeFile, isFile, isProject, useState} from '@/state'
import {Page} from '@/types'
import {IconCanvas, IconFileText, IconFolderRoot} from '../../icons/File'
import {LangIcon} from '../../icons/LangIcon'
import {IconMoreHoriz} from '../../icons/Ui'
import {Ghost, GhostContainer, LinkMenu, TreeLinkCorner, TreeLinkItem, TreeLinkTitle} from './Style'
import {useTreeUi} from './Submenu'

export const TreeLink = (p: {node: MenuTreeItem; level: number; selected?: boolean}) => {
  let ghostRef!: HTMLDivElement
  let ref!: HTMLSpanElement
  let anchor!: HTMLElement

  const [grabbing, setGrabbing] = createSignal(false)
  const {
    appService,
    deleteService,
    canvasCollabService,
    fileService,
    canvasService,
    projectService,
    locationService,
    treeService,
  } = useState()
  const title = useTitle({item: p.node.value})
  const tree = useTreeUi()

  const onClick = async () => {
    if (!isProject(p.node.value)) locationService.openItem(p.node.value)
  }

  const onCornerClick = () => treeService.collapse(p.node.id)

  const getCurrentId = () =>
    locationService.canvasId ?? locationService.editorId ?? locationService.codeId

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
        } else if (el?.closest('#grid')) {
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
        deleted={tree.showDeleted && !p.node.value.deleted}
        active={p.node.value.id === getCurrentId()}
        selected={p.selected || p.node === tree.currentTooltip()?.state.selected}
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
          selected={tree.currentTooltip()?.state.selected === p.node}
          onClick={(e: MouseEvent) => showLinkMenu(e, anchor, p.node)}
          data-testid="tree_link_menu"
        >
          <IconMoreHoriz />
        </LinkMenu>
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
