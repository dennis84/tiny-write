import {Delta} from 'quill'
import {State, File, Config} from '.'
import {setItem} from './effects/LocalStorage'
import {updateMenu, reload} from './effects/Electron'
import {createMenu} from './menu'
import {isEmpty} from './utils/quill'

export const UpdateState = (state: State, data: string) => {
  let parsed
  try {
    parsed = JSON.parse(data)
  } catch (err) {}

  if (!parsed) {
    return state
  }

  const newState = {...state}
  if (parsed.text) newState.text = parsed.text
  if (parsed.lastModified) newState.lastModified = new Date(parsed.lastModified)
  if (parsed.files) newState.files = parsed.files.map(file => {
    file.lastModified = new Date(file.lastModified)
    file.text = file.text.ops ? file.text : {ops: []}
    return file
  })

  if (parsed.config) newState.config = {...newState.config, ...parsed.config}

  return [
    newState,
    [updateMenu, {fn: createMenu(newState)}],
  ]
}

export const ChangeConfig = (state: State, config: Config) => {
  const newState = {...state, config: {...state.config, ...config}}
  return [
    newState,
    [setItem, {
      key: 'tiny_write.app.data',
      value: JSON.stringify(newState),
    }],
    [updateMenu, {fn: createMenu(newState)}],
  ]
}

export const OnTextChange = (state: State, text: Delta) => {
  if (state.text === text) {
    return state
  }

  const newState = isEmpty(text) ?
    {...state, text: {ops: []}, lastModified: new Date} :
    {...state, text, lastModified: new Date}

  return [
    newState,
    [setItem, {
      key: 'tiny_write.app.data',
      value: JSON.stringify(newState),
    }],
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
    text: {ops: []},
    files: files,
    lastModified: new Date,
  }

  return [
    newState,
    [setItem, {
      key: 'tiny_write.app.data',
      value: JSON.stringify(newState),
    }],
    [updateMenu, {fn: createMenu(newState)}],
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
    [setItem, {
      key: 'tiny_write.app.data',
      value: JSON.stringify(newState),
    }],
    [reload, {}],
  ]
}

export const Close = (state) => {
  const files = [...state.files]
  const next = files.shift() ?? {
    text: {ops: []},
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
    [setItem, {
      key: 'tiny_write.app.data',
      value: JSON.stringify(newState),
    }],
  ]
}
