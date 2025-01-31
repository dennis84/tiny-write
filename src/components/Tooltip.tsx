import {JSX, onCleanup, onMount, Show} from 'solid-js'
import {createMutable, unwrap} from 'solid-js/store'
import {styled} from 'solid-styled-components'
import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
  Placement,
  ReferenceElement,
} from '@floating-ui/dom'

const TooltipEl = styled('div')`
  position: absolute;
  width: max-content;
  background: var(--tooltip-background);
  border-radius: var(--border-radius);
  font-family: var(--menu-font-family);
  font-size: var(--menu-font-size);
  line-height: 1.4;
  z-index: var(--z-index-tooltip);
  box-shadow: 0 12px 24px 0 rgba(0, 0, 0, 0.24);
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  &::-webkit-scrollbar {
    display: none;
  }
`

export const TooltipButton = styled('div')`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  padding: 2px 6px;
  margin: 2px 0;
  min-height: 32px;
  cursor: var(--cursor-pointer);
  border-radius: var(--border-radius-small);
  &:hover,
  &.selected {
    background: var(--primary-background);
    color: var(--primary-foreground);
  }
  .icon {
    margin-right: 5px;
  }
`

export const TooltipDivider = styled('hr')`
  height: 3px;
  border: 0;
  border-radius: 5px;
  background: var(--foreground-10);
  margin: 5px 0;
`

export const TooltipArrow = styled('span')`
  width: 10px;
  height: 10px;
  background: var(--tooltip-background);
  position: absolute;
  transform: rotate(45deg);
`

const Backdrop = styled('div')`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-index-tooltip);
`

interface Cleanup {
  fn?: () => void
}

interface Props {
  anchor: ReferenceElement
  placement?: Placement
  offset?: number
  fallbackPlacements?: Placement[]
  onClose?: () => void
  closeable?: boolean
  backdrop?: boolean
  children: JSX.Element
}

export const Tooltip = (props: Props) => {
  let tooltipRef: HTMLDivElement | undefined
  let arrowRef: HTMLSpanElement | undefined
  const cleanup = createMutable<Cleanup>({})

  const onBackdropClick = (e: MouseEvent) => {
    e.stopPropagation()
    e.stopImmediatePropagation()
    props.onClose?.()
  }

  const CloseOnBackgroundClick = () => {
    const listener = (e: MouseEvent) => {
      e.stopPropagation()
      if (!tooltipRef?.contains(e.target as Node)) {
        props.onClose?.()
      }
    }

    onMount(() => {
      // Cannot use click, otherwise click is triggerd after last gesture event (lostpointercapture)
      document.addEventListener('pointerdown', listener)
    })

    onCleanup(() => {
      document.removeEventListener('pointerdown', listener)
    })

    return <></>
  }

  onMount(() => {
    const placement = props.placement ?? 'bottom'
    const fallbackPlacements = props.fallbackPlacements ?? undefined

    cleanup.fn = autoUpdate(props.anchor, tooltipRef!, async () => {
      void computePosition(props.anchor, tooltipRef!, {
        placement,
        middleware: [
          offset(props.offset ?? 10),
          flip({fallbackPlacements}),
          shift({padding: 10}),
          arrow({element: arrowRef!}),
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

    onCleanup(() => {
      unwrap(cleanup).fn?.()
    })
  })

  return (
    <>
      <Show when={props.closeable !== false}>
        <Show when={props.backdrop} fallback={<CloseOnBackgroundClick />}>
          <Backdrop onClick={onBackdropClick} />
        </Show>
      </Show>
      <TooltipEl ref={tooltipRef} id="tooltip" class="tooltip">
        {props.children}
        <TooltipArrow ref={arrowRef} />
      </TooltipEl>
    </>
  )
}
