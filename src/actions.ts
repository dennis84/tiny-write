import {State, Config} from '.'
import {setItem} from './effects/LocalStorage'
import {send} from './effects/IpcRenderer'

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
    [send, {event: 'config', data: newState.config}],
  ]
}

export const ChangeConfig = (state: State, config: Config) => {
  console.log('ChangeConfig', config)
  const newState = {...state, config: {...state.config, ...config}}
  return [
    newState,
    [setItem, {
      key: 'tiny_write.app.data',
      value: JSON.stringify(newState),
    }],
    [send, {event: 'config', data: newState.config}],
  ]
}

export const OnTextChange = (state: State, text: string) => [
  {...state, text},
  [setItem, {
    key: 'tiny_write.app.data',
    value: JSON.stringify({text: text, config: state.config}),
  }],
]
