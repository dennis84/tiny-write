import {Location} from '@solidjs/router'
import {File, LocationState, State} from '@/state'
import {Box, Vec} from '@tldraw/editor'

const ydoc = 'Uint8Array'
const editorView = undefined
const codeEditorView = undefined

export const stateToString = (state: State) =>
  JSON.stringify({
    ...state,
    files: state.files.map((f) => ({...f, ydoc, editorView, codeEditorView})),
  } as any)

export const fileToString = (file: Partial<File>) =>
  JSON.stringify({...file, ydoc, editorView, codeEditorView})

export const locationToString = (location: Location<LocationState>) =>
  JSON.stringify({
    path: location.pathname,
    share: location.query.share ?? false,
    prev: location.state?.prev,
    file: location.state?.file,
    newFile: location.state?.newFile,
    merge: location.state?.merge,
  })

export const renderPoint = (point: Vec, id = 'point') => {
  document.querySelector(`#${id}`)?.remove()
  const box = new Box(point.x, point.y, 10, 10)
  renderBox(box, id)
}

export const renderBox = (box: Box, id = 'box') => {
  document.querySelector(`#${id}`)?.remove()
  const el = document.createElement('div')
  el.id = id
  el.style.position = 'absolute'
  el.style.left = `${box.x}px`
  el.style.top = `${box.y}px`
  el.style.width = `${box.width}px`
  el.style.height = `${box.height}px`
  el.style.background = 'rgba(255, 255, 0, 0.2)'
  el.style.zIndex = 'var(--z-index-max)'
  el.style.pointerEvents = 'none'
  const b = document.querySelector('#board')
  b?.append(el)
}
