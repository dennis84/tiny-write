import Delta from 'quill-delta'
import {State, File, Config, Notification, newState} from '.'
import {setItem} from './effects/LocalStorage'
import {updateMenu} from './effects/Electron'
import {createMenu} from './menu'
import {isEmpty} from './utils/quill'

const isState = (x: any) =>
  x.text?.ops &&
  x.lastModified instanceof Date &&
  Array.isArray(x.files)

const isFile = (x: any): boolean =>
  x.text?.ops &&
  x.lastModified instanceof Date

const isConfig = (x: any): boolean =>
  typeof x.theme === 'string' &&
  typeof x.codeTheme === 'string' &&
  typeof x.font === 'string'

const UpdateMenuEffect = (state) =>
  [updateMenu, {fn: createMenu(state)}]

const UpdateDataEffect = (state) =>
  [setItem, {
    key: 'tiny_write.app.data',
    value: JSON.stringify(state),
  }]

export const Notify = (state: State, notification: Notification) =>
  ({...state, notification})

export const Clean = (state: State) => {
  const next = newState()
  return [
    next,
    UpdateDataEffect(next),
    UpdateMenuEffect(next),
  ]
}

export const UpdateState = (state: State, data: string) => {
  let parsed
  try {
    parsed = JSON.parse(data)
  } catch (err) {}

  if (!parsed) {
    return state
  }

  const config = {...state.config, ...parsed.config}
  if (!isConfig(config)) {
    return [
      Notify(state, {title: 'Config is invalid', props: config}),
      UpdateMenuEffect(state)
    ]
  }

  const newState = {...state, ...parsed, config}
  if (parsed.lastModified) newState.lastModified = new Date(parsed.lastModified)
  if (parsed.files) {
    for (const file of parsed.files) {
      file.text = new Delta(file.text)
      file.lastModified = new Date(file.lastModified)
      if (!isFile(file)) {
        return [
          Notify(state, {title: 'File is invalid', props: file}),
          UpdateMenuEffect(state),
        ]
      }
    }
  }

  if (!isState(newState)) {
    return [
      Notify(state, {title: 'State is invalid', props: newState}),
      UpdateMenuEffect(state),
    ]
  }

  return [
    newState,
    UpdateMenuEffect(newState),
  ]
}

export const ChangeConfig = (state: State, config: Config) => {
  const newState = {...state, config: {...state.config, ...config}}
  return [
    newState,
    UpdateDataEffect(newState),
    UpdateMenuEffect(newState),
  ]
}

export const OnTextChange = (state: State, text: Delta) => {
  if (state.text === text) {
    return state
  }

  const newState = isEmpty(text) ?
    {...state, text: new Delta, lastModified: new Date} :
    {...state, text, lastModified: new Date}

  return [
    newState,
    UpdateDataEffect(newState),
  ]
}

export const New = (state: State) => {
  if (state.text.ops.length === 0) {
    return state
  }

  const files = [...state.files]

  files.push({
    text: state.text,
    lastModified: state.lastModified,
  })

  const newState = {
    ...state,
    text: new Delta,
    files: files,
    lastModified: new Date,
  }

  return [
    newState,
    UpdateDataEffect(newState),
    UpdateMenuEffect(newState),
  ]
}

export const Open = (state, file: File) => {
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
  const newState = {
    ...state,
    files: files,
    text: next.text,
    lastModified: next.lastModified,
  }

  return [
    newState,
    UpdateDataEffect(newState),
    UpdateMenuEffect(newState),
  ]
}

export const Close = (state) => {
  const files = [...state.files]
  const next = files.shift() ?? {
    text: new Delta(),
    lastModified: new Date,
  }

  const newState = {
    ...state,
    files: files,
    text: next.text,
    lastModified: next.lastModified,
  }

  return [
    newState,
    UpdateDataEffect(newState),
  ]
}
