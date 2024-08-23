import {File, State} from '@/state'

const ydoc = 'Uint8Array'
const editorView = undefined

export const stateToString = (state: State) =>
  JSON.stringify({
    ...state,
    files: state.files.map((f) => ({...f, ydoc, editorView})),
  } as any)

export const fileToString = (file: Partial<File>) => JSON.stringify({...file, ydoc, editorView})
