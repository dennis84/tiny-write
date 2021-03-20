import {useContext, createContext, Dispatch as Disp, Reducer} from 'react'
import {ProseMirrorState, isEmpty} from './prosemirror/prosemirror'
import {State, File, Config, ErrorObject} from '.'
import {isMac} from './env'

export const newState = (props: Partial<State> = {}): State => ({
  lastModified: new Date(),
  files: [],
  loading: true,
  fullscreen: false,
  config: {
    theme: 'light',
    codeTheme: 'material-light',
    font: 'merriweather',
    fontSize: 24,
    alwaysOnTop: isMac,
    typewriterMode: true,
    dragHandle: true,
  },
  ...props,
})

export const UpdateError = (error: ErrorObject) => (state: State) => ({
  ...state,
  error,
  loading: false,
})

export const Clean = () => newState()

export const UpdateState = (newState: State) => () => newState

export const UpdateConfig = (config: Config) => (state: State) => ({
  ...state,
  config: {...state.config, ...config},
  lastModified: new Date(),
})

export const ToggleFullscreen = (state: State) => ({
  ...state,
  fullscreen: !state.fullscreen,
})

export const UpdateText = (text: ProseMirrorState) => (state: State) => ({
  ...state,
  text,
  lastModified: new Date(),
})

export const New = (state: State) => {
  if (isEmpty(state.text.editorState)) {
    return state
  }

  const files = [...state.files]

  files.push({
    text: state.text.editorState.toJSON(),
    lastModified: state.lastModified.toISOString(),
  })

  return {
    ...state,
    text: undefined,
    files,
    lastModified: new Date(),
  }
}

export const Open = (file: File) => (state: State) => {
  const files = [...state.files]
  if (!isEmpty(state.text.editorState)) {
    files.push({
      text: state.text.editorState.toJSON(),
      lastModified: state.lastModified.toISOString(),
    })
  }

  const index = files.indexOf(file)
  const [text, lastModified] = newText(state.text, files[index])
  files.splice(index, 1)

  return {
    ...state,
    files,
    text,
    lastModified,
  }
}

export const Discard = (state: State) => {
  const files = [...state.files]
  const file = files.shift()
  const [text, lastModified] = file ? newText(state.text, file) : [undefined, new Date()]

  return {
    ...state,
    files,
    text,
    lastModified,
  }
}

const newText = (text: ProseMirrorState, file: File): [ProseMirrorState, Date] => {
  const newState = {...text, editorState: file.text, initialized: false}
  return [newState, new Date(file.lastModified)]
}

type Action = (state: State) => State

export type Dispatch = Disp<Action>

export const ReducerContext = createContext<Dispatch>(null)

export const useDispatch = () => useContext(ReducerContext)

export const reducer: Reducer<State, Action> =
  (state: State, action: Action) => action(state)
