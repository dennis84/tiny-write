import {useContext, createContext, Reducer} from 'react'
import {EditorState} from 'prosemirror-state'
import {State, File, Config, Notification, newState} from '.'
import {isEmpty} from './components/ProseMirror/util'

export const Notify = (notification: Notification) => (state: State) =>
  ({...state, notification, loading: false})

export const NotificationClose = (state: State) =>
  ({...state, notification: undefined})

export const Clean = () => newState()

export const UpdateState = (newState: State) => () => newState

export const UpdateConfig = (config: Config) => (state: State) =>
  ({...state, config: {...state.config, ...config}, lastModified: new Date})

export const UpdateText = (text: EditorState) => (state: State) => {
  return {...state, text, lastModified: new Date}
}

export const New = (state: State) => {
  if (isEmpty(state.text)) {
    return state
  }

  const files = [...state.files]

  files.push({
    text: state.text,
    lastModified: state.lastModified,
  })

  return {
    ...state,
    text: undefined,
    files: files,
    lastModified: new Date,
  }
}

export const Open = (file: File) => (state: State) => {
  const files = [...state.files]
  if (!isEmpty(state.text)) {
    files.push({
      text: state.text,
      lastModified: state.lastModified,
    })
  }

  const index = files.indexOf(file)
  const next = files[index]
  files.splice(index, 1)

  return {
    ...state,
    files: files,
    text: next.text,
    lastModified: next.lastModified,
  }
}

export const Close = (state: State) => {
  const files = [...state.files]
  const next = files.shift() ?? {
    lastModified: new Date,
    text: undefined,
  }

  return {
    ...state,
    files: files,
    text: next.text,
    lastModified: next.lastModified,
  }
}

export const ToggleAlwaysOnTop = (state) => ({
  ...state,
  alwaysOnTop: !state.alwaysOnTop,
  lastModified: new Date,
})

type Action = (state: State) => State

export const ReducerContext = createContext<any>(null)

export const useDispatch = () => useContext(ReducerContext)

export const reducer: Reducer<State, Action> =
  (state: State, action: Action) => action(state)
