import {Location} from '@solidjs/router'
import {File, LocationState, State} from '@/state'

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
  })
