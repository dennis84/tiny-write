import {arrow, autoUpdate, computePosition, flip, offset, shift, size} from '@floating-ui/dom'
import {type JSX, Match, onCleanup, onMount, Show, Switch} from 'solid-js'
import {ZIndex} from '@/utils/ZIndex'
import type {Dialog as DialogType} from '../../services/DialogService'
import {ButtonPrimary} from '../Button'
import {DialogContainer, DialogLayer, ToastLayer, TooltipArrow} from './Style'

type Props = Omit<DialogType, 'component' | 'state'> & {
  children: JSX.Element
  index: number
}

export const Dialog = (props: Props) => {
  let dialogRef!: HTMLDivElement
  let arrowRef!: HTMLSpanElement

  const zIndex = ZIndex.dialog(props.index)

  const onClose = (e: MouseEvent) => {
    const target = e.target as Node
    if (dialogRef?.contains(target)) return

    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
    props.onClose?.()
  }

  const CloseOnBackgroundClick = () => {
    const listener = (e: MouseEvent) => {
      const target = e.target as Node
      if (props.anchor instanceof Element && props.anchor.contains(target)) {
        onClose(e)
        return
      }

      if (!dialogRef?.contains(target)) {
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

    const cleanup = autoUpdate(anchor, dialogRef, async () => {
      void computePosition(anchor, dialogRef, {
        placement,
        middleware: [
          offset(props.offset ?? 10),
          flip({fallbackPlacements}),
          shift({padding: 10, crossAxis: true}),
          arrow({element: arrowRef, padding: 20}),
          size({
            padding: 20,
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
        dialogRef.style.left = `${x}px`
        dialogRef.style.top = `${y}px`

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

  onMount(() => {
    if (props.duration) {
      setTimeout(() => props.onClose?.(), props.duration)
    }
  })

  return (
    <Switch>
      <Match when={props.anchor}>
        <CloseOnBackgroundClick />
        <DialogContainer
          ref={dialogRef}
          id="tooltip"
          data-testid="tooltip"
          class="tooltip"
          delay={props.delay}
          direction={props.direction}
          gap={props.direction === 'row' ? 5 : 0}
          style={{'z-index': zIndex}}
        >
          {props.children}
          <TooltipArrow ref={arrowRef} />
        </DialogContainer>
      </Match>
      <Match when={props.toast}>
        <ToastLayer>
          <DialogContainer
            ref={dialogRef}
            direction={'row'}
            class="toast"
            style={{'z-index': zIndex}}
          >
            {props.children}
            <Show when={props.toastAction}>
              <ButtonPrimary onClick={onClose}>{props.toastAction}</ButtonPrimary>
            </Show>
          </DialogContainer>
        </ToastLayer>
      </Match>
      <Match when={true}>
        <DialogLayer onClick={onClose} style={{'z-index': zIndex}} data-testid="dialog_layer">
          <DialogContainer
            ref={dialogRef}
            delay={props.delay}
            style={{'z-index': ZIndex.dialog(props.index)}}
            data-testid="dialog"
          >
            {props.children}
          </DialogContainer>
        </DialogLayer>
      </Match>
    </Switch>
  )
}
