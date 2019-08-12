import {State, File, Config} from '.'
import {setItem} from './effects/LocalStorage'
import {updateMenu, reload} from './effects/Electron'
import {createMenu} from './menu'

export const UpdateState = (state: State, data: string) => {
  const parsed = JSON.parse(data)
  if(!parsed) {
    return state
  }

  const newState = {...state}
  if(parsed.text) newState.text = parsed.text
  if(parsed.lastModified) newState.lastModified = new Date(parsed.lastModified)
  if(parsed.files) newState.files = parsed.files.map(file => {
    file.lastModified = new Date(file.lastModified)
    return file
  })

  if(parsed.config) newState.config = {...newState.config, ...parsed.config}

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

export const OnTextChange = (state: State, text: string) => {
  if (state.text === text) {
    return state
  }

  return [
    {...state, text, lastModified: new Date},
    [setItem, {
      key: 'tiny_write.app.data',
      value: JSON.stringify(state),
    }],
  ]
}

export const New = (state: State) => {
  if (state.text == '') {
    return state
  }

  const files = [...state.files]

  files.push({
    text: state.text,
    lastModified: state.lastModified,
  })

  const newState = {
    ...state,
    files: files,
    text: '',
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
  if (state.text != '') {
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

export const Clear = (state) => {
  const newState = {...state, text: '', lastModified: new Date}
  return [
    newState,
    [setItem, {
      key: 'tiny_write.app.data',
      value: JSON.stringify(newState),
    }],
  ]
}

export const Next = (state) =>
  state.files.length ? Open(state, state.files[0]) : state
