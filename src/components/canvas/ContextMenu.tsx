import {Vector} from '@flatten-js/core'
import {createEffect, For, Match, on, onMount, Show, Suspense, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useDialog} from '@/hooks/use-dialog'
import {useTitle} from '@/hooks/use-title'
import {createMarkdownParser} from '@/prosemirror/markdown-serialize'
import {schema} from '@/prosemirror/schema'
import type {Dialog} from '@/services/DialogService'
import {isCanvas, isCodeFile, isFile, useState} from '@/state'
import type {CanvasLinkElement, File} from '@/types'
import {pause} from '@/utils/promise'
import {DialogList, TooltipButton, TooltipDivider} from '../dialog/Style'
import {IconAi} from '../icons/Ai'
import {IconCanvas, IconCodeBlocks, IconFileCode, IconFilePlus} from '../icons/File'

const Scroller = styled.div`
  max-height: 80vh;
  overflow-y: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`

export const ContextMenu = () => {
  const {
    store,
    canvasService,
    copilotService,
    canvasCollabService,
    canvasThreadService,
    fileService,
    treeService,
    dialogService,
  } = useState()

  const newFile = async (code = false, link?: CanvasLinkElement, cm?: Vector) => {
    const added = await canvasService.newFile(code, link, cm)
    let file: File | undefined
    if (added) {
      const fileElement = added[0]
      canvasCollabService.addElements(added)
      file = fileService.findFileById(fileElement.id)

      if (file) await treeService.add(file)
    }

    closeTooltip()
    return file
  }

  const generateAiFile = async (link: CanvasLinkElement, cm?: Vector) => {
    const messages = canvasThreadService.getMessages(link.from)
    if (!messages.length) return

    const file = await newFile(false, link, cm)
    await pause(100)

    const editorView = file?.editorView
    if (!editorView) return
    const parser = createMarkdownParser(schema)
    let buffer = ''

    const result = await copilotService.completions(
      messages,
      (chunk) => {
        for (const choice of chunk.choices) {
          buffer += choice.delta?.content ?? choice.message?.content ?? ''
        }

        const node = parser.parse(buffer)
        const tr = editorView.state.tr
        tr.delete(0, editorView.state.doc.content.size)
        tr.insert(0, node)
        editorView.dispatch(tr)
      },
      true,
    )

    if (result.success) {
      dialogService.toast({message: 'AI file generated', duration: 2_000})
    } else if (result.error) {
      dialogService.toast({message: 'AI file generation failed'})
    }
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
            <IconCanvas />
          </Match>
          <Match when={isCodeFile(p.file)}>
            <IconCodeBlocks />
          </Match>
          <Match when={!isCodeFile(p.file)}>
            <IconFileCode />
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

    const boardLeft = canvasService.canvasRef?.getBoundingClientRect().left ?? 0

    const virtualEl = {
      getBoundingClientRect() {
        return {
          x: x + boardLeft,
          y,
          top: y,
          left: x + boardLeft,
          bottom: y,
          right: x + boardLeft,
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
    <DialogList>
      <TooltipButton
        onClick={() => newFile(false, props.dialog.state?.deadLink, props.dialog.state?.clickPos)}
        data-testid="context_menu_new_file"
      >
        <IconFilePlus /> New file
      </TooltipButton>
      <TooltipButton
        onClick={() => newFile(true, props.dialog.state?.deadLink, props.dialog.state?.clickPos)}
        data-testid="context_menu_new_code_file"
      >
        <IconCodeBlocks /> New code file
      </TooltipButton>
      <Show when={store.ai?.copilot?.user}>
        <Show when={props.dialog.state?.deadLink}>
          {(link) => (
            <TooltipButton onClick={() => generateAiFile(link(), props.dialog.state.clickPos)}>
              <IconAi /> New file by AI
            </TooltipButton>
          )}
        </Show>
      </Show>
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
    </DialogList>
  )

  const [showTooltip, closeTooltip, currentTooltip] = useDialog({
    component: Tooltip,
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
