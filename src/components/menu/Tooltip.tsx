import {JSX, createEffect, onCleanup} from 'solid-js'
import {styled} from 'solid-styled-components'
import {arrow, computePosition, flip, limitShift, offset, shift} from '@floating-ui/dom'

const TooltipEl = styled('div')`
  position: absolute;
  min-width: 150px;
`

interface Props {
  anchor?: HTMLElement;
  onClose: () => void;
  children: JSX.Element;
}

export const Tooltip = (props: Props) => {
  let tooltipRef: HTMLDivElement | undefined
  let arrowRef: HTMLSpanElement | undefined

  const listener = (e: MouseEvent) => {
    if (!props.anchor) return
    if ((e.target as Element).closest('.menu-tooltip')) return
    props.onClose()
  }

  onCleanup(() => {
    document.removeEventListener('click', listener)
  })

  createEffect(() => {
    const target = props.anchor
    if (!target) return

    document.addEventListener('click', listener)

    void computePosition(target, tooltipRef!, {
      placement: 'bottom',
      middleware: [
        offset(10),
        flip(),
        shift({padding: 20}),
        arrow({element: arrowRef!}),
      ],
    }).then(({x, y, placement, middlewareData}) => {
      tooltipRef!.style.left = `${x}px`
      tooltipRef!.style.top = `${y}px`

      const side = placement.split('-')[0]
      const staticSide = {
        top: 'bottom',
        right: 'left',
        bottom: 'top',
        left: 'right'
      }[side] ?? 'top'

      if (middlewareData.arrow) {
        const {x, y} = middlewareData.arrow
        arrowRef?.classList.add(staticSide)
        Object.assign(arrowRef!.style, {
          left: x != null ? `${x}px` : '',
          top: y != null ? `${y}px` : '',
          [staticSide]: `${-arrowRef!.offsetWidth / 2}px`
        });
      }
    })
  })

  return (
    <TooltipEl ref={tooltipRef} class="menu-tooltip">
      {props.children}
      <span ref={arrowRef} class="arrow"></span>
    </TooltipEl>
  )
}
