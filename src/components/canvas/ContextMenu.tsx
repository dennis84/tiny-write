import {Vector} from '@flatten-js/core'
import {createEffect, For, Match, on, onMount, Show, Suspense, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useDialog} from '@/hooks/use-dialog'
import {useTitle} from '@/hooks/use-title'
import type {Dialog} from '@/services/DialogService'
import {isCanvas, isCodeFile, isFile, useState} from '@/state'
import type {CanvasLinkElement, File} from '@/types'
import {TooltipButton, TooltipDivider} from '../dialog/Style'
import {IconCodeBlocks, IconGesture, IconPostAdd, IconTextSnippet} from '../Icon'

const Scroller = styled('div')`
  max-height: 80vh;
  overflow-y: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`

export const ContextMenu = () => {
  const {canvasService, canvasCollabService, fileService, treeService} = useState()

  const onNewFile = async (code = false, link?: CanvasLinkElement, cm?: Vector) => {
    const added = await canvasService.newFile(code, link, cm)
    if (added) {
      canvasCollabService.addElements(added)
      const fileElement = added[0]
      const file = fileService.findFileById(fileElement.id)
      if (file) treeService.add(file)
    }

    closeTooltip()
  }

  const FileNameTooltipButton = (p: {file: File; link?: CanvasLinkElement; cm?: Vector}) => {
    const onClick = async () => {
      const added = await canvasService.addFile(p.file, p.link, p.cm)
      if (added) canvasCollabService.addElements(added)
      closeTooltip()
    }

    const title = useTitle({item: p.file})

    return (
      <TooltipButton onClick={onClick}>
        <Switch>
          <Match when={isCanvas(p.file)}>
            <IconGesture />
          </Match>
          <Match when={isCodeFile(p.file)}>
            <IconCodeBlocks />
          </Match>
          <Match when={!isCodeFile(p.file)}>
            <IconTextSnippet />
          </Match>
        </Switch>
        <Suspense>{title()}</Suspense>
      </TooltipButton>
    )
  }

  const getFiles = (): File[] | undefined => {
    const currentCanvas = canvasService.currentCanvas
    if (!currentCanvas) return []

    const files: File[] = []
    treeService.descendants((n) => {
      if (
        isFile(n.value) &&
        !n.value.deleted &&
        !currentCanvas.elements.find((el) => el.id === n.id)
      ) {
        files.push(n.value)
      }
    }, currentCanvas.parentId)

    return files.length > 0 ? files : undefined
  }

  const openContextMenu = (mousePos?: [number, number]) => {
    const deadLink = canvasService.findDeadLinks()[0]
    const clickPos = mousePos ? canvasService.getPosition(mousePos) : undefined
    if (!deadLink && !clickPos) return

    const currentCanvas = canvasService.currentCanvas
    if (!currentCanvas) return

    const p = deadLink ? new Vector(deadLink.toX, deadLink.toY) : clickPos
    if (!p) return

    const {camera} = currentCanvas
    const {x, y} = new Vector(camera.point[0], camera.point[1]).add(p).multiply(camera.zoom)

    const virtualEl = {
      getBoundingClientRect() {
        return {
          x,
          y,
          top: y,
          left: x,
          bottom: y,
          right: x,
          width: 1,
          height: 1,
        }
      },
    }

    showTooltip({anchor: virtualEl, state: {deadLink, clickPos}})
  }

  onMount(() => {
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#grid')) {
        return
      }

      e.preventDefault()
      openContextMenu([e.clientX, e.clientY])
    }

    document.oncontextmenu = onContextMenu
  })

  type ContextMenuTooltip = {
    deadLink?: CanvasLinkElement
    clickPos?: Vector
  }

  const Tooltip = (props: {dialog: Dialog<ContextMenuTooltip>}) => (
    <>
      <TooltipButton
        onClick={() => onNewFile(false, props.dialog.state?.deadLink, props.dialog.state?.clickPos)}
        data-testid="context_menu_new_file"
      >
        <IconPostAdd /> New file
      </TooltipButton>
      <TooltipButton
        onClick={() => onNewFile(true, props.dialog.state?.deadLink, props.dialog.state?.clickPos)}
        data-testid="context_menu_new_code_file"
      >
        <IconCodeBlocks /> New code file
      </TooltipButton>
      <Show when={getFiles()}>
        {(files) => (
          <>
            <TooltipDivider />
            <Scroller>
              <For each={files()}>
                {(file: File) => (
                  <FileNameTooltipButton
                    file={file}
                    link={props.dialog.state?.deadLink}
                    cm={props.dialog.state?.clickPos}
                  />
                )}
              </For>
            </Scroller>
          </>
        )}
      </Show>
    </>
  )

  const [showTooltip, closeTooltip, currentTooltip] = useDialog({
    component: Tooltip,
    backdrop: true,
    onClose: async () => {
      await canvasService.removeDeadLinks()
    },
  })

  createEffect(
    on(
      () => canvasService.findDeadLinks()[0],
      (deadLink) => {
        // Reopen tooltip removes dead links, so don't reopen if tooltip is already open
        if (!deadLink || currentTooltip() !== undefined) return
        openContextMenu()
      },
    ),
  )

  return null
}
