import {JSX, onCleanup, onMount} from 'solid-js'
import {createMutable, unwrap} from 'solid-js/store'
import {styled} from 'solid-styled-components'
import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  Placement,
  ReferenceElement,
} from '@floating-ui/dom'

const TooltipEl = styled('div')`
  position: absolute;
  min-width: 150px;
  width: max-content;
  background: var(--tooltip-background);
  border-radius: var(--border-radius);
  font-family: var(--menu-font-family);
  font-size: var(--menu-font-size);
  line-height: 1.4;
  z-index: var(--z-index-tooltip);
  box-shadow: 0 12px 24px 0 rgba(0, 0, 0, 0.24);
  padding: 6px 8px;
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
  .divider {
    height: 3px;
    border: 0;
    border-radius: 5px;
    background: var(--foreground-10);
    margin: 5px 0;
  }
  .arrow {
    width: 6px;
    height: 6px;
    background: var(--tooltip-background);
    position: absolute;
    transform: rotate(45deg);
  }
`

interface Cleanup {
  fn?: () => void
}

interface Props {
  anchor: ReferenceElement
  placement?: Placement
  fallbackPlacements?: Placement[]
  onClose?: () => void
  children: JSX.Element
}

export const Tooltip = (props: Props) => {
  let tooltipRef: HTMLDivElement | undefined
  let arrowRef: HTMLSpanElement | undefined
  const cleanup = createMutable<Cleanup>({})

  const listener = (e: MouseEvent) => {
    if ((e.target as Element).closest('.tooltip')) return
    props.onClose?.()
  }

  onMount(() => {
    // Click is triggered immediately when link is drawn
    setTimeout(() => document.addEventListener('click', listener))

    const placement = props.placement ?? 'bottom'
    const fallbackPlacements = props.fallbackPlacements ?? undefined

    cleanup.fn = autoUpdate(props.anchor, tooltipRef!, async () => {
      void computePosition(props.anchor, tooltipRef!, {
        placement,
        middleware: [
          offset(10),
          flip({fallbackPlacements}),
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

    onCleanup(() => {
      document.removeEventListener('click', listener)
      unwrap(cleanup).fn?.()
    })
  })

  return (
    <TooltipEl ref={tooltipRef} id="tooltip" class="tooltip">
      {props.children}
      <span ref={arrowRef} class="arrow"></span>
    </TooltipEl>
  )
}