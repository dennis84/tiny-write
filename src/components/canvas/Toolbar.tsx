import {Box} from '@flatten-js/core'
import type {ReferenceElement} from '@floating-ui/dom'
import {createScheduled, debounce, leadingAndTrailing} from '@solid-primitives/scheduled'
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onCleanup,
  Show,
  Suspense,
} from 'solid-js'
import {getLanguageNames} from '@/codemirror/highlight'
import {createCodeFence} from '@/components/assistant/util'
import {TooltipButton} from '@/components/dialog/Style'
import {
  IconAdjust,
  IconAiAssistant,
  IconHistory,
  IconLanguage,
  IconOpenInFull,
  IconPrettier,
} from '@/components/Icon'
import {useDialog} from '@/hooks/use-dialog'
import {useInputLine} from '@/hooks/use-input-line'
import type {Dialog} from '@/services/DialogService'
import {isCodeElement, isEditorElement, useState} from '@/state'
import {AttachmentType, type CanvasBoxElement, type CanvasElement} from '@/types'
import {BoxUtil} from '@/utils/BoxUtil'
import {VecUtil} from '@/utils/VecUtil'

export const Toolbar = () => {
  const {
    store,
    canvasService,
    codeService,
    fileService,
    menuService,
    threadService,
    treeService,
    locationService,
  } = useState()
  const [inViewport, setInViewport] = createSignal(false)
  const showInputLine = useInputLine()

  const restore = async (element: CanvasElement) => {
    await fileService.restore(element.id)
    treeService.updateAll()
  }

  const prettify = async (element: CanvasElement) => {
    const file = fileService.findFileById(element.id)
    if (!file) return
    await codeService.prettify(file)
  }

  const changeLang = async (element: CanvasElement) => {
    const file = fileService.findFileById(element.id)
    if (!file) return
    const language = file.codeLang ?? ''

    showInputLine({
      value: language,
      words: getLanguageNames(),
      onEnter: (lang) => {
        codeService.updateLang(file, lang)
      },
    })
  }

  const onBackToContent = async () => {
    const currentCanvas = canvasService.currentCanvas
    if (!currentCanvas) return
    const selected = getSelected()
    if (!selected) return
    const box = canvasService.createBox(selected.element)
    canvasService.backToContent(VecUtil.center(box), currentCanvas.camera.zoom)
  }

  const onCopilot = () => {
    const selected = getSelected()
    if (!selected) return
    const file = fileService.findFileById(selected.element.id)
    if (!file?.codeEditorView) return

    menuService.showAssistant()
    threadService.addAttachment({
      type: AttachmentType.File,
      fileId: file.id,
      content: createCodeFence({
        id: file.id,
        code: file.codeEditorView.state.doc.toString(),
        lang: file.codeLang,
        path: file.path,
      }),
    })
  }

  const getSelected = () => {
    if (store.selecting || store.moving) return
    const currentCanvas = canvasService.currentCanvas
    if (!currentCanvas) return
    const selected = currentCanvas.elements.filter(
      (e) => (isEditorElement(e) || isCodeElement(e)) && e.selected,
    )

    if (selected.length > 1) return

    const element = selected[0] as CanvasBoxElement
    if (!element) return

    const {zoom, point} = currentCanvas.camera
    const p = VecUtil.fromArray(point)
    const box = BoxUtil.fromRect({
      x: (element.x + p.x) * zoom,
      y: (element.y + p.y) * zoom,
      width: element.width * zoom,
      height: element.height * zoom,
    })

    return {element, box}
  }

  const calcToolbarReference = (): ReferenceElement | undefined => {
    const selected = getSelected()
    if (!selected) return

    const currentCanvas = canvasService.currentCanvas
    if (!currentCanvas) return

    const zoom = currentCanvas.camera.zoom
    const point = VecUtil.fromArray(currentCanvas.camera.point).multiply(-1)
    const vp = new Box(0, 0, window.innerWidth, window.innerHeight)
      .scale(1 / zoom, 1 / zoom)
      .translate(point)

    const box = canvasService.createBox(selected.element)
    setInViewport(vp.intersect(box))

    return {
      getBoundingClientRect() {
        return {
          x: selected.box.xmin,
          y: selected.box.ymin,
          top: selected.box.ymin,
          left: selected.box.xmin,
          bottom: selected.box.ymax,
          right: selected.box.xmax,
          width: selected.box.width,
          height: selected.box.height,
        }
      },
    }
  }

  // Show toolbar if reference changes
  createEffect(() => {
    const reference = calcToolbarReference()
    const selected = getSelected()
    if (!reference || !selected) {
      closeDialog()
      return
    }

    showDialog({anchor: reference, state: {element: selected.element}})
  })

  // Close dialog after navigation
  onCleanup(() => closeDialog())

  const scheduled = createScheduled((fn) => leadingAndTrailing(debounce, fn, 2000))

  const deferredItemKey = createMemo(() => {
    if (scheduled()) {
      const selected = getSelected()
      if (!selected) return undefined
      const file = fileService.findFileById(selected.element.id)
      return file?.lastModified
    }
  })

  // Check if the file needs prettifying
  const [isFileUgly] = createResource(deferredItemKey, () => {
    const selected = getSelected()
    if (!selected) return false
    const file = fileService.findFileById(selected.element.id)
    if (!file?.lastModified) return false
    return codeService.prettifyCheck(file)
  })

  type ToolbarState = {element: CanvasElement}

  const ToolbarDialog = (p: {dialog: Dialog<ToolbarState>}) => (
    <>
      <Show when={inViewport()}>
        <TooltipButton onClick={() => locationService.openItem(p.dialog.state.element)}>
          <IconOpenInFull /> Open in full
        </TooltipButton>
        <Show when={fileService.findFileById(p.dialog.state.element.id)?.deleted}>
          <TooltipButton onClick={() => restore(p.dialog.state.element)}>
            <IconHistory />
            Restore
          </TooltipButton>
        </Show>
        <Show when={isCodeElement(p.dialog.state.element)}>
          <TooltipButton
            onClick={() => changeLang(p.dialog.state.element)}
            data-testid="toolbar_change_language"
          >
            <IconLanguage /> Change language
          </TooltipButton>

          <Suspense>
            <Show when={isFileUgly()}>
              <TooltipButton
                onClick={() => prettify(p.dialog.state.element)}
                data-testid="toolbar_prettify"
              >
                <IconPrettier /> Prettify
              </TooltipButton>
            </Show>
          </Suspense>

          <Show when={store.ai?.copilot?.user}>
            <TooltipButton onClick={onCopilot}>
              <IconAiAssistant /> Ask Copilot
            </TooltipButton>
          </Show>
        </Show>
      </Show>
      <Show when={!inViewport()}>
        <TooltipButton onClick={onBackToContent}>
          <IconAdjust /> Back to content
        </TooltipButton>
      </Show>
    </>
  )

  const [showDialog, closeDialog] = useDialog<ToolbarState>({
    component: ToolbarDialog,
    offset: 50,
    direction: 'row',
    placement: 'bottom',
    fallbackPlacements: ['top'],
  })

  return null
}
