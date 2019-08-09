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

export const OnTextChange = (state: State, text: string) => [
  {...state, text, lastModified: new Date},
  [setItem, {
    key: 'tiny_write.app.data',
    value: JSON.stringify(state),
  }],
]

export const New = (state: State) => {
  if (state.text == '') {
    return state
  }

  state.files.push({
    text: state.text,
    lastModified: state.lastModified,
  })

  const newState = {
    ...state,
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
  if (state.text != '') {
    state.files.push({
      text: state.text,
      lastModified: state.lastModified,
    })
  }

  const index = state.files.indexOf(file)
  const opened = state.files[index]
  state.files.splice(index, 1)
  const newState = {
    ...state,
    text: opened.text,
    lastModified: opened.lastModified,
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
