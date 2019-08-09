import {State, Config} from '.'
import {setItem} from './effects/LocalStorage'
import {updateMenu} from './effects/Electron'
import {createMenu} from './menu'

export const UpdateState = (state: State, data: string) => {
  const parsed = JSON.parse(data)
  if(!parsed) {
    return state
  }

  const newState = {...state}
  if(parsed.text) newState.text = parsed.text
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
  {...state, text},
  [setItem, {
    key: 'tiny_write.app.data',
    value: JSON.stringify({text: text, config: state.config}),
  }],
]
