import {For, Match, Show, Switch, createSignal, onMount} from 'solid-js'
import {Vec} from '@tldraw/editor'
import {CanvasLinkElement, File, isCanvas, isCodeFile, isFile, useState} from '@/state'
import {IconCodeBlocks, IconGesture, IconPostAdd, IconTextSnippet} from '../Icon'
import {Tooltip, TooltipButton, TooltipDivider} from '../Tooltip'
import {ReferenceElement} from '@floating-ui/dom'

export const ContextMenu = () => {
  const {canvasService, canvasCollabService, fileService, treeService} = useState()
  const [contextMenu, setContextMenu] = createSignal<Vec | undefined>()

  const onNewFile = async (code = false, link?: CanvasLinkElement, cm?: Vec) => {
    const el = await canvasService.newFile(code, link, cm)
    await canvasService.removeDeadLinks()
    if (el) {
      canvasCollabService.addElement(el)
      const file = fileService.findFileById(el.id)
      if (file) treeService.add(file)
    }

    setContextMenu(undefined)
  }

  const FileNameTooltipButton = (p: {file: File; link?: CanvasLinkElement; cm?: Vec}) => {
    const [title, setTitle] = createSignal<string>()

    const onClick = async () => {
      const added = await canvasService.addFile(p.file, p.link, p.cm)
      await canvasService.removeDeadLinks()
      canvasCollabService.addElements(added ?? [])
      setContextMenu(undefined)
    }

    onMount(async () => {
      setTitle(await fileService.getTitle(p.file))
    })

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
        {title()}
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

  const getContextMenu = ():
    | [CanvasLinkElement | undefined, Vec | undefined, ReferenceElement]
    | undefined => {
    const deadLink = canvasService.findDeadLinks()[0]
    const cm = contextMenu()
    if (!deadLink && !cm) return

    const currentCanvas = canvasService.currentCanvas
    if (!currentCanvas) return

    const p = deadLink ? new Vec(deadLink.toX, deadLink.toY) : cm
    if (!p) return

    const {camera} = currentCanvas
    const {x, y} = Vec.FromArray(camera.point).add(p).mul(camera.zoom)

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

    return [deadLink, cm, virtualEl]
  }

  const onTooltipClose = async () => {
    await canvasService.removeDeadLinks()
    setContextMenu(undefined)
  }

  onMount(() => {
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#grid')) {
        return
      }

      e.preventDefault()
      setContextMenu(canvasService.getPosition([e.clientX, e.clientY]))
    }

    document.oncontextmenu = onContextMenu
  })

  return (
    <Show when={getContextMenu()} keyed>
      {([link, cm, tooltipAnchor]) => (
        <Tooltip anchor={tooltipAnchor} onClose={onTooltipClose} backdrop={true}>
          <TooltipButton
            onClick={() => onNewFile(false, link, cm)}
            data-testid="context_menu_new_file"
          >
            <IconPostAdd /> New file
          </TooltipButton>
          <TooltipButton
            onClick={() => onNewFile(true, link, cm)}
            data-testid="context_menu_new_code_file"
          >
            <IconCodeBlocks /> New code file
          </TooltipButton>
          <Show when={getFiles()}>
            {(files) => (
              <>
                <TooltipDivider />
                <For each={files()}>
                  {(file: File) => <FileNameTooltipButton file={file} link={link} cm={cm} />}
                </For>
              </>
            )}
          </Show>
        </Tooltip>
      )}
    </Show>
  )
}
