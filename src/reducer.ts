import {useContext, createContext, Dispatch as Disp, Reducer} from 'react'
import {ProseMirrorState, isEmpty} from './prosemirror/prosemirror'
import {State, File, Config, ErrorObject, Collab} from '.'
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

export const UpdateText = (text: ProseMirrorState, lastModified?: Date) => (state: State) => ({
  ...state,
  text,
  lastModified: lastModified ?? new Date(),
})

export const UpdateCollab = (
  collab: Collab,
  text?: ProseMirrorState,
  backup?: boolean
) => (state: State) => {
  const newState = backup ? New(state) : state
  return {
    ...newState,
    collab,
    text: text ?? newState.text,
    clientId: collab?.socket?.id,
  }
}

export const New = (state: State) => {
  if (isEmpty(state.text.editorState)) {
    return state
  }

  const files = [...state.files]

  files.push({
    text: state.path ? undefined : state.text.editorState.toJSON(),
    lastModified: state.lastModified.toISOString(),
    path: state.path,
  })

  return {
    ...state,
    text: undefined,
    files,
    lastModified: new Date(),
    collab: undefined,
    path: undefined,
  }
}

export const Open = (file: File) => (state: State) => {
  const files = [...state.files]
  if (!isEmpty(state.text.editorState)) {
    files.push({
      text: state.path ? undefined : state.text.editorState.toJSON(),
      lastModified: state.lastModified.toISOString(),
      path: state.path,
    })
  }

  const findIndexOfFile = (f) => {
    for (let i = 0; i < files.length; i++) {
      if (files[i] === f) return i
      else if (f.path && files[i].path === f.path) return i
    }

    return -1
  }

  const index = findIndexOfFile(file)
  const {text, lastModified, path} = newText(state.text, file)
  if (index !== -1) {
    files.splice(index, 1)
  }

  return {
    ...state,
    files,
    text,
    lastModified,
    path,
    collab: undefined,
  }
}

export const Discard = (state: State) => {
  const files = [...state.files]
  const file = files.shift()
  const {text, lastModified, path} = file ? newText(state.text, file) : {
    text: undefined,
    lastModified: new Date(),
    path: undefined,
  }

  return {
    ...state,
    files,
    text,
    lastModified,
    path,
    collab: file ? undefined : state.collab,
  }
}

interface WokenFile {
  text: ProseMirrorState;
  lastModified: Date;
  path?: string;
}

const newText = (text: ProseMirrorState, file: File): WokenFile => {
  const newState = {...text, editorState: file.text, initialized: false}
  return {
    text: newState,
    lastModified: new Date(file.lastModified),
    path: file.path,
  }
}

type Action = (state: State) => State

export type Dispatch = Disp<Action>

export const ReducerContext = createContext<Dispatch>(null)

export const useDispatch = () => useContext(ReducerContext)

export const reducer: Reducer<State, Action> =
  (state: State, action: Action) => action(state)
