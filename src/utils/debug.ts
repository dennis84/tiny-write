import {Box, type Vector} from '@flatten-js/core'
import type {LocationState} from '@/state'

export const renderPoint = (point: Vector, id = 'point') => {
  document.querySelector(`#${id}`)?.remove()
  const box = new Box(point.x, point.y, 10, 10)
  renderBox(box, id)
}

export const renderBox = (box: Box, id = 'box') => {
  document.querySelector(`#${id}`)?.remove()
  const el = document.createElement('div')
  el.id = id
  el.style.position = 'absolute'
  el.style.left = `${box.xmin}px`
  el.style.top = `${box.ymax}px`
  el.style.width = `${box.width}px`
  el.style.height = `${box.height}px`
  el.style.background = 'rgba(255, 255, 0, 0.2)'
  el.style.zIndex = 'var(--z-index-max)'
  el.style.pointerEvents = 'none'
  const b = document.querySelector('#board')
  b?.append(el)
}

export const locationStateToString = (loc?: Partial<LocationState> | null) =>
  loc
    ? JSON.stringify({
        ...loc,
        ...(loc.merge ? {merge: '<<large data>>'} : {}),
      })
    : String(loc)
