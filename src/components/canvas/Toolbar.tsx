import {Box} from '@flatten-js/core'
import {arrow, computePosition, flip, offset, type ReferenceElement, shift} from '@floating-ui/dom'
import {createScheduled, debounce, leadingAndTrailing} from '@solid-primitives/scheduled'
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Show,
  Suspense,
  untrack,
} from 'solid-js'
import {getLanguageNames} from '@/codemirror/highlight'
import {createCodeFence} from '@/components/assistant/util'
import {
  IconAdjust,
  IconAiAssistant,
  IconHistory,
  IconLanguage,
  IconOpenInFull,
  IconPrettier,
} from '@/components/Icon'
import {TooltipArrow, TooltipButton, TooltipContainer} from '@/components/Tooltip'
import {useOpen} from '@/hooks/use-open'
import {
  AttachmentType,
  type CanvasBoxElement,
  type CanvasElement,
  isCodeElement,
  isEditorElement,
  useState,
} from '@/state'
import {BoxUtil} from '@/utils/BoxUtil'
import {VecUtil} from '@/utils/VecUtil'

export const Toolbar = () => {
  let tooltipRef!: HTMLDivElement
  let arrowRef!: HTMLSpanElement

  const {
    store,
    inputLineService,
    canvasService,
    codeService,
    fileService,
    menuService,
    threadService,
    treeService,
  } = useState()
  const [collides, setCollides] = createSignal(false)
  const {openFile} = useOpen()

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

    inputLineService.setInputLine({
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
    setCollides(vp.intersect(box))

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

  const positionToolbar = (reference: ReferenceElement) =>
    computePosition(reference, tooltipRef, {
      placement: 'bottom',
      middleware: [
        offset(100),
        flip({fallbackPlacements: ['top']}),
        shift({padding: 20, crossAxis: true}),
        arrow({element: arrowRef}),
      ],
    }).then(({x, y, placement, middlewareData}) => {
      tooltipRef.style.left = `${x}px`
      tooltipRef.style.top = `${y}px`

      const side = placement.split('-')[0]
      const staticSide =
        {
          top: 'bottom',
          right: 'left',
          bottom: 'top',
          left: 'right',
        }[side] ?? 'top'

      if (middlewareData.arrow) {
        const {x, y} = middlewareData.arrow
        arrowRef.classList.add(staticSide)
        Object.assign(arrowRef.style, {
          left: x != null ? `${x}px` : '',
          top: y != null ? `${y}px` : '',
          [staticSide]: `${-arrowRef.offsetWidth / 2}px`,
        })
      }
    })

  // Show toolbar if reference changes
  createEffect(() => {
    const reference = calcToolbarReference()
    if (!reference) return
    untrack(() => positionToolbar(reference))
  })

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

  return (
    <Show when={getSelected()}>
      {(selected) => (
        <TooltipContainer ref={tooltipRef} id="toolbar" direction="row" gap={5}>
          <Show when={collides()}>
            <TooltipButton onClick={() => openFile(selected().element)}>
              <IconOpenInFull /> Open in full
            </TooltipButton>
            <Show when={fileService.findFileById(selected().element.id)?.deleted}>
              <TooltipButton onClick={() => restore(selected().element)}>
                <IconHistory />
                Restore
              </TooltipButton>
            </Show>
            <Show when={isCodeElement(selected().element)}>
              <TooltipButton
                onClick={() => changeLang(selected().element)}
                data-testid="toolbar_change_language"
              >
                <IconLanguage /> Change language
              </TooltipButton>

              <Suspense>
                <Show when={isFileUgly()}>
                  <TooltipButton
                    onClick={() => prettify(selected().element)}
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
          <Show when={!collides()}>
            <TooltipButton onClick={onBackToContent}>
              <IconAdjust /> Back to content
            </TooltipButton>
          </Show>
          <TooltipArrow ref={arrowRef} />
        </TooltipContainer>
      )}
    </Show>
  )
}
