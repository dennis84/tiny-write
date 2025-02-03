import {createEffect, createSignal, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Box, Vec} from '@tldraw/editor'
import {arrow, computePosition, flip, offset, shift} from '@floating-ui/dom'
import {v4 as uuidv4} from 'uuid'
import {
  CanvasBoxElement,
  CanvasElement,
  isCodeElement,
  isEditorElement,
  MessageType,
  useState,
} from '@/state'
import {useOpen} from '@/open'
import {getLanguageNames} from '@/codemirror/highlight'
import {
  IconAdjust,
  IconAiAssistant,
  IconHistory,
  IconLanguage,
  IconOpenInFull,
  IconPrettier,
} from '@/components/Icon'
import {createCodeFence} from '@/components/assistant/util'

const Container = styled('div')`
  position: absolute;
  background: var(--tooltip-background);
  border-radius: var(--border-radius);
  font-family: var(--menu-font-family);
  font-size: var(--menu-font-size);
  line-height: 1.4;
  z-index: var(--z-index-tooltip);
  box-shadow: 0 12px 24px 0 rgba(0, 0, 0, 0.24);
  padding: 6px 8px;
  display: flex;
  gap: 5px;
  div {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    padding: 6px 8px;
    margin: 2px 0;
    min-height: 32px;
    cursor: var(--cursor-pointer);
    border-radius: var(--border-radius-small);
    &:hover,
    &.selected {
      background: var(--primary-background);
      color: var(--primary-foreground);
    }
    > span {
      margin-right: 5px;
    }
  }
  .arrow {
    width: 6px;
    height: 6px;
    background: var(--tooltip-background);
    position: absolute;
    transform: rotate(45deg);
  }
`

const Item = styled('div')``

export const Toolbar = () => {
  let tooltipRef!: HTMLDivElement
  let arrowRef: HTMLSpanElement | undefined

  const {
    store,
    inputLineService,
    canvasService,
    codeService,
    fileService,
    menuService,
    threadService,
  } = useState()
  const [ugly, setUgly] = createSignal(false)
  const [collides, setCollides] = createSignal(false)
  const {open} = useOpen()

  const restore = async (element: CanvasElement) => {
    await fileService.restore(element.id)
    calcPosition()
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
    canvasService.backToContent(box.center, currentCanvas.camera.zoom)
  }

  const onCopilot = () => {
    const selected = getSelected()
    if (!selected) return
    const file = fileService.findFileById(selected.element.id)
    if (!file?.codeEditorView) return

    menuService.showAssistant()
    threadService.addMessage({
      id: uuidv4(),
      role: 'user',
      type: MessageType.File,
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
    const p = Vec.FromArray(point)
    const box = new Box(
      (element.x + p.x) * zoom,
      (element.y + p.y) * zoom,
      element.width * zoom,
      element.height * zoom,
    )

    return {element, box}
  }

  const calcPosition = () => {
    const selected = getSelected()
    if (!selected) return

    const currentCanvas = canvasService.currentCanvas
    if (!currentCanvas) return

    const point = Vec.FromArray(currentCanvas.camera.point).mul(-1)
    const vp = new Box(0, 0, window.innerWidth, window.innerHeight)
      .scale(currentCanvas.camera.zoom)
      .translate(point)

    const box = canvasService.createBox(selected.element)
    setCollides(vp.collides(box))

    const reference = {
      getBoundingClientRect() {
        return {
          x: selected.box.x,
          y: selected.box.y,
          top: selected.box.y,
          left: selected.box.x,
          bottom: selected.box.maxY,
          right: selected.box.maxX,
          width: selected.box.width,
          height: selected.box.height,
        }
      },
    }

    computePosition(reference, tooltipRef!, {
      placement: 'bottom',
      middleware: [
        offset(100),
        flip({fallbackPlacements: ['top']}),
        shift({padding: 20, crossAxis: true}),
        arrow({element: arrowRef!}),
      ],
    }).then(({x, y, placement, middlewareData}) => {
      tooltipRef!.style.left = `${x}px`
      tooltipRef!.style.top = `${y}px`

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
        arrowRef?.classList.add(staticSide)
        Object.assign(arrowRef!.style, {
          left: x != null ? `${x}px` : '',
          top: y != null ? `${y}px` : '',
          [staticSide]: `${-arrowRef!.offsetWidth / 2}px`,
        })
      }
    })
  }

  createEffect(() => {
    calcPosition()
  })

  createEffect(async () => {
    const selected = getSelected()
    if (!selected) return
    const file = fileService.findFileById(selected.element.id)
    if (!file?.lastModified) return
    const result = await codeService.prettifyCheck(file)
    if (result !== ugly()) {
      setUgly(result)
      calcPosition()
    }
  })

  return (
    <Show when={getSelected()}>
      {(selected) => (
        <Container ref={tooltipRef} id="toolbar">
          <Show when={collides()}>
            <Item onClick={() => open(selected().element, true)}>
              <IconOpenInFull /> Open in full
            </Item>
            <Show when={fileService.findFileById(selected().element.id)?.deleted}>
              <Item onClick={() => restore(selected().element)}>
                <IconHistory />
                Restore
              </Item>
            </Show>
            <Show when={isCodeElement(selected().element)}>
              <Item onClick={() => changeLang(selected().element)}>
                <IconLanguage /> Change language
              </Item>
              <Show when={ugly()}>
                <Item onClick={() => prettify(selected().element)}>
                  <IconPrettier /> Prettify
                </Item>
              </Show>
              <Show when={store.ai?.copilot?.user}>
                <Item onClick={onCopilot}>
                  <IconAiAssistant /> Ask Copilot
                </Item>
              </Show>
            </Show>
          </Show>
          <Show when={!collides()}>
            <Item onClick={onBackToContent}>
              <IconAdjust /> Back to content
            </Item>
          </Show>
          <span ref={arrowRef} class="arrow"></span>
        </Container>
      )}
    </Show>
  )
}
