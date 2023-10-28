import {arrow, computePosition, flip, offset, shift} from '@floating-ui/dom'

export const computeTooltipPosition = (
  anchorRef: HTMLElement,
  tooltipRef: HTMLElement,
  arrowRef: HTMLElement
) => {
  computePosition(anchorRef, tooltipRef, {
    placement: 'bottom',
    middleware: [
      offset(10),
      flip(),
      shift(),
      arrow({element: arrowRef}),
    ],
  }).then(({x, y, placement, middlewareData}) => {
    tooltipRef.style.left = `${x}px`
    tooltipRef.style.top = `${y}px`

    const side = placement.split('-')[0]
    const staticSide = {
      top: 'bottom',
      right: 'left',
      bottom: 'top',
      left: 'right'
    }[side] ?? 'top'

    if (middlewareData.arrow) {
      const {x, y} = middlewareData.arrow
      Object.assign(arrowRef.style, {
        left: x != null ? `${x}px` : '',
        top: y != null ? `${y}px` : '',
        [staticSide]: `${-arrowRef.offsetWidth / 2}px`
      });
    }
  })
}
