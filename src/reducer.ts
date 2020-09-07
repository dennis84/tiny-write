import {useContext, createContext, Reducer } from 'react';
import {Node} from 'slate'
import {State, File, Config, Notification, newState, emptyText} from '.'

const isState = (x: any) =>
  Node.isNodeList(x.text) &&
  Array.isArray(x.files)

const isFile = (x: any): boolean =>
  Node.isNodeList(x.text) &&
  x.lastModified instanceof Date

const isConfig = (x: any): boolean =>
  typeof x.theme === 'string' &&
  typeof x.codeTheme === 'string' &&
  typeof x.font === 'string'

export const Notify = (notification: Notification) => (state: State) =>
  ({...state, notification})

export const NotificationClose = (state: State) =>
  ({...state, notification: undefined})

export const Clean = (state: State) => newState()

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

  const text = !parsed.text[0]?.children ? emptyText() : parsed.text

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

  if (parsed.files) {
    for (const file of parsed.files) {
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
  ({...state, config: {...state.config, ...config}})

export const UpdateText = (text: Node[], lastModified: Date) => (state: State) =>
  ({...state, text, lastModified})

export const New = (state: State) => {
  if (state.text.length === 1 && Node.string(state.text[0]) === '') {
    return state
  }

  const files = [...state.files]

  files.push({
    text: state.text,
    lastModified: state.lastModified,
  })

  return {
    ...state,
    text: emptyText(),
    files: files,
    lastModified: new Date,
  }
}

export const Open = (file: File) => (state: State) => {
  const files = [...state.files]
  if (state.text.length !== 0) {
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
    text: emptyText(),
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
});

type Action = (state: State) => State;

export const ReducerContext = createContext<any>(null);

export const useDispatch = () => useContext(ReducerContext);

export const reducer: Reducer<State, Action> =
  (state: State, action: Action) => action(state);
