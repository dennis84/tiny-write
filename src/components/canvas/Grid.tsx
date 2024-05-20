import {useState} from '@/state'
import {styled} from 'solid-styled-components'

const STEPS = [[1.5, 5], [1, 1]]

const GridSvg = styled('svg')`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
  fill: var(--foreground);
  overscroll-behavior: none;
`

export const Grid = ({onClick}: {onClick: () => void}) => {
  const [, ctrl] = useState()

  return (
    <GridSvg id="grid" onClick={onClick} version="1.1" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {STEPS.map(([r, size], i) => {
          const grid = 10
          const camera = ctrl.canvas.currentCanvas?.camera
          if (!camera) return

          const s = size * grid * camera.zoom
          const xo = camera.point[0] * camera.zoom
          const yo = camera.point[1] * camera.zoom
          const gxo = xo > 0 ? xo % s : s + (xo % s)
          const gyo = yo > 0 ? yo % s : s + (yo % s)
          const opacity = 0.1

          return (
            <pattern
              id={`grid-${i}`}
              width={s}
              height={s}
              patternUnits="userSpaceOnUse"
            >
              <circle cx={gxo} cy={gyo} r={r} opacity={opacity} />
            </pattern>
          )
        })}
      </defs>
      {STEPS.map((_, i) => (
        <rect
          width="100%"
          height="100%"
          fill={`url(#grid-${i})`}
        />
      ))}
    </GridSvg>
  )
}
