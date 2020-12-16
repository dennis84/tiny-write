import {useContext, createContext, Dispatch as Disp, Reducer} from 'react'
import {EditorState} from 'prosemirror-state'
import {State, File, Config, Error, newState} from '.'
import {isEmpty} from './components/ProseMirror'

export const UpdateError = (error: Error) => (state: State) => ({
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

export const UpdateText = (text: EditorState) => (state: State) => ({
  ...state,
  text,
  lastModified: new Date(),
})

export const New = (state: State) => {
  if (isEmpty(state.text)) {
    return state
  }

  const files = [...state.files]

  files.push({
    text: state.text.toJSON(),
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
  if (!isEmpty(state.text)) {
    files.push({
      text: state.text.toJSON(),
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

export const ToggleAlwaysOnTop = (state: State) => ({
  ...state,
  alwaysOnTop: !state.alwaysOnTop,
  lastModified: new Date(),
})

const newText = (text: EditorState, file: File): EditorState => {
  const newEditorState = EditorState.fromJSON({
    schema: text.schema,
    plugins: text.plugins,
  }, file.text)

  return [
    newEditorState,
    new Date(file.lastModified)
  ]
}

type Action = (state: State) => State

export type Dispatch = Disp<Action>

export const ReducerContext = createContext<Dispatch>(null)

export const useDispatch = () => useContext(ReducerContext)

export const reducer: Reducer<State, Action> =
  (state: State, action: Action) => action(state)
