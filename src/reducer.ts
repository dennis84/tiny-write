import {useContext, createContext, Dispatch as Disp, Reducer} from 'react'
import {EditorState} from 'prosemirror-state'
import {ProseMirrorState, isEmpty} from './prosemirror/state'
import {State, File, Config, ErrorObject, Collab, LoadingType} from '.'
import {isMac} from './env'

export const newState = (props: Partial<State> = {}): State => ({
  files: [],
  loading: 'loading',
  fullscreen: false,
  markdown: false,
  config: {
    theme: undefined,
    codeTheme: 'material-light',
    font: 'merriweather',
    fontSize: 24,
    contentWidth: 800,
    alwaysOnTop: isMac,
    typewriterMode: true,
    prettier: {
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      semi: false,
      singleQuote: true,
    }
  },
  ...props,
})

export const UpdateError = (error: ErrorObject) => (state: State): State => ({
  ...state,
  error,
  loading: 'error',
})

export const UpdateLoading = (loading: LoadingType) => (state: State) => ({
  ...state,
  loading,
})

export const Clean = (state: State) => newState({
  loading: 'initialized',
  files: state.files,
  fullscreen: state.fullscreen,
})

export const UpdateState = (newState: State) => () => newState

export const UpdateConfig = (config: Config, lastModified = new Date()) => (state: State) => ({
  ...state,
  config: {...state.config, ...config},
  lastModified,
})

export const ToggleFullscreen = (state: State) => ({
  ...state,
  fullscreen: !state.fullscreen,
})

export const UpdatePath = (path: string) => (state: State) => ({...state, path})

export const UpdateText = (
  text: ProseMirrorState,
  lastModified?: Date,
  markdown?: boolean,
) => (state: State) => ({
  ...state,
  text,
  lastModified: lastModified ?? state.lastModified,
  markdown: markdown ?? state.markdown,
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
  }
}

export const New = (state: State) => {
  if (isEmpty(state.text.editorState)) {
    return state
  }

  const files = [...state.files]
  const text = state.path ? undefined : (state.text.editorState as EditorState).toJSON()

  files.push({
    text,
    lastModified: state.lastModified.toISOString(),
    path: state.path,
    markdown: state.markdown,
  })

  return {
    ...state,
    text: undefined,
    files,
    lastModified: undefined,
    collab: undefined,
    path: undefined,
  }
}

export const Open = (file: File) => (state: State): State => {
  const files = [...state.files]
  if (!isEmpty(state.text?.editorState)) {
    const text = state.path ? undefined : (state.text.editorState as EditorState).toJSON()
    if (state.lastModified) {
      files.push({
        text,
        lastModified: state.lastModified?.toISOString(),
        path: state.path,
        markdown: state.markdown,
      })
    }
  }

  const findIndexOfFile = (f: File) => {
    for (let i = 0; i < files.length; i++) {
      if (files[i] === f) return i
      else if (f.path && files[i].path === f.path) return i
    }

    return -1
  }

  const index = findIndexOfFile(file)
  if (index !== -1) {
    file.lastModified = files[index].lastModified
    files.splice(index, 1)
  }

  const next = createTextFromFile(file)
  return {
    ...state,
    files,
    text: next.text,
    path: next.path,
    lastModified: next.lastModified,
    markdown: next.markdown,
    collab: undefined,
  }
}

export const Discard = (state: State) => {
  const files = [...state.files]
  const file = files.shift()
  const next = file ? createTextFromFile(file) : {
    text: undefined,
    lastModified: undefined,
    path: undefined,
    markdown: state.markdown,
  }

  return {
    ...state,
    files,
    text: next.text,
    path: next.path,
    lastModified: next.lastModified,
    markdown: next.markdown,
    collab: file ? undefined : state.collab,
  }
}

const createTextFromFile = (file: File) => ({
  text: {editorState: file.text},
  lastModified: file.lastModified ? new Date(file.lastModified) : undefined,
  path: file.path,
  markdown: file.markdown,
})

type Action = (state: State) => State

export type Dispatch = Disp<Action>

export const ReducerContext = createContext<Dispatch>(null)

export const useDispatch = () => useContext(ReducerContext)

export const reducer: Reducer<State, Action> =
  (state: State, action: Action) => action(state)
