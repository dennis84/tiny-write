import {arrow, autoUpdate, computePosition, flip, offset, shift, size} from '@floating-ui/dom'
import {type JSX, onCleanup, onMount, Show} from 'solid-js'
import {ZIndex} from '@/utils/ZIndex'
import type {Dialog as DialogType} from '../../services/DialogService'
import {DialogContainer, DialogLayer, TooltipArrow} from './Style'

type Props = Omit<DialogType, 'component' | 'state'> & {
  children: JSX.Element
  index: number
}

export const Dialog = (props: Props) => {
  let tooltipRef!: HTMLDivElement
  let arrowRef!: HTMLSpanElement

  const onClose = (e: MouseEvent) => {
    e.stopPropagation()
    e.stopImmediatePropagation()
    props.onClose?.()
  }

  const CloseOnBackgroundClick = () => {
    const listener = (e: MouseEvent) => {
      if (!tooltipRef?.contains(e.target as Node)) {
        onClose(e)
      }
    }

    onMount(() => {
      // Cannot use click, otherwise click is triggerd after last gesture event (lostpointercapture)
      document.addEventListener('pointerdown', listener)
    })

    onCleanup(() => {
      document.removeEventListener('pointerdown', listener)
    })

    return null
  }

  onMount(() => {
    const anchor = props.anchor
    if (!anchor) return

    const placement = props.placement ?? 'bottom'
    const fallbackPlacements = props.fallbackPlacements ?? undefined

    const cleanup = autoUpdate(anchor, tooltipRef, async () => {
      void computePosition(anchor, tooltipRef, {
        placement,
        middleware: [
          offset(props.offset ?? 10),
          flip({fallbackPlacements}),
          shift({padding: {left: 10, right: 10}}),
          arrow({element: arrowRef, padding: 20}),
          size({
            apply({availableWidth, availableHeight, elements}) {
              // Change styles, e.g.
              Object.assign(elements.floating.style, {
                maxWidth: `${Math.max(0, availableWidth)}px`,
                maxHeight: `${Math.max(0, availableHeight)}px`,
              })
            },
          }),
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
          arrowRef?.classList.add(staticSide)
          Object.assign(arrowRef?.style, {
            left: x != null ? `${x}px` : '',
            top: y != null ? `${y}px` : '',
            [staticSide]: `${-arrowRef?.offsetWidth / 2}px`,
          })
        }
      })
    })

    onCleanup(() => cleanup())
  })

  return (
    <>
      <Show when={props.anchor}>
        <CloseOnBackgroundClick />
        <DialogContainer
          ref={tooltipRef}
          id="tooltip"
          data-testid="tooltip"
          class="tooltip"
          delay={props.delay}
          direction={props.direction}
          gap={props.direction === 'row' ? 5 : 0}
          style={{'z-index': ZIndex.dialog(props.index)}}
        >
          {props.children}
          <TooltipArrow ref={arrowRef} />
        </DialogContainer>
      </Show>
      <Show when={!props.anchor}>
        <DialogLayer
          onClick={onClose}
          style={{'z-index': ZIndex.dialog(props.index)}}
          data-testid="dialog_layer"
        >
          <DialogContainer
            ref={tooltipRef}
            delay={props.delay}
            style={{'z-index': ZIndex.dialog(props.index)}}
            data-testid="dialog"
          >
            {props.children}
          </DialogContainer>
        </DialogLayer>
      </Show>
    </>
  )
}
