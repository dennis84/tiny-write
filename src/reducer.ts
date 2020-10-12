import {useContext, createContext, Reducer} from 'react'
import {EditorState} from 'prosemirror-state'
import {State, File, Config, Notification, newState} from '.'
import {createState, createEmptyState} from './components/ProseMirror/state'
import {isEmpty} from './components/ProseMirror/util'

const isText = (x: any) => x && x.doc

const isState = (x: any) =>
  x.lastModified instanceof Date &&
  Array.isArray(x.files)

const isFile = (x: any): boolean =>
  x.text &&
  x.lastModified instanceof Date

const isConfig = (x: any): boolean =>
  typeof x.theme === 'string' &&
  typeof x.codeTheme === 'string' &&
  typeof x.font === 'string'

export const Notify = (notification: Notification) => (state: State) =>
  ({...state, notification})

export const NotificationClose = (state: State) =>
  ({...state, notification: undefined})

export const Clean = () => newState()

export const Load = (data: any) => (state: State) => {
  let parsed
  try {
    parsed = JSON.parse(data)
  } catch (err) {}

  if (!parsed) {
    return {...state, loading: false}
  }

  const config = {...state.config, ...parsed.config}
  if (!isConfig(config)) {
    return {
      ...state,
      loading: false,
      notification: {
        id: 'invalid_config',
        props: config
      }
    }
  }

  if (!isText(parsed.text)) {
    return {
      ...state,
      loading: false,
      notification: {
        id: 'invalid_file',
        props: parsed.text,
      },
    }
  }

  let text
  try {
    text = createState(parsed.text)
  }  catch (err) {
    return {
      ...state,
      loading: false,
      notification: {
        id: 'invalid_file',
        props: parsed.text,
      },
    }
  }

  const newState = {
    ...state,
    ...parsed,
    text,
    config,
    loading: false,
  }

  if (parsed.lastModified) {
    newState.lastModified = new Date(parsed.lastModified)
  }

  if (parsed.lastModified) newState.lastModified = new Date(parsed.lastModified)
  if (parsed.files) {
    for (const file of parsed.files) {
      file.text = createState(file.text)
      file.lastModified = new Date(file.lastModified)
      if (!isFile(file)) {
        return {
          ...state,
          loading: false,
          notification: {
            id: 'invalid_file',
            props: file,
          },
        }
      }
    }
  }

  if (!isState(newState)) {
    return {
      ...state,
      loading: false,
      notification: {
        id: 'invalid_state',
        props: newState
      }
    }
  }

  return newState
}

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
    text: createEmptyState(),
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
    text: createEmptyState(),
    lastModified: new Date,
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
