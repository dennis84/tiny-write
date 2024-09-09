import {createEffect, Show} from 'solid-js'
import {useNavigate} from '@solidjs/router'
import {styled} from 'solid-styled-components'
import {Box, Vec} from '@tldraw/editor'
import {arrow, computePosition, flip, offset, shift} from '@floating-ui/dom'
import {CanvasBoxElement, CanvasElement, isCodeElement, isEditorElement, useState} from '@/state'
import {Icon} from '../Icon'

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
  div {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    padding: 6px 8px;
    margin: 2px 0;
    min-height: 32px;
    cursor: var(--cursor-pointer);
    border-radius: var(--border-radius);
    &:hover,
    &.selected {
      background: var(--primary-background);
      color: var(--primary-foreground);
    }
    > span {
      margin-right: 10px;
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

  const {store, canvasService} = useState()
  const navigate = useNavigate()

  const open = async (element: CanvasElement) => {
    if (isEditorElement(element)) {
      navigate(`/editor/${element.id}`)
    } else if (isCodeElement(element)) {
      navigate(`/code/${element.id}`)
    }
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

  createEffect(() => {
    const selected = getSelected()
    if (!selected) return

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
        shift({padding: 20}),
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
  })

  return (
    <Show when={getSelected()}>
      {(selected) => (
        <Container ref={tooltipRef} id="toolbar">
          <Item onClick={() => open(selected().element)}>
            <Icon>open_in_full</Icon> Open in full
          </Item>
          <span ref={arrowRef} class="arrow"></span>
        </Container>
      )}
    </Show>
  )
}
