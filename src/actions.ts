import {State} from '.'
import {setItem} from './effects/LocalStorage'
import {send} from './effects/IpcRenderer'
import Many from './effects/Many'

export const UpdateState = (state: State, data: string) => {
  const parsed = JSON.parse(data)
  if(!parsed) {
    return state
  }

  const newState = {...state}
  if(parsed.text) newState.text = parsed.text
  if(parsed.light) newState.light = parsed.light
  if(parsed.theme) newState.theme = parsed.theme
  return [
    newState,
    [send, {event: 'theme', data: newState.theme}],
  ]
}

export const ChangeTheme = (state: State, theme: string) => [
  {...state, theme},
  [Many, [
    [setItem, {
      key: 'tiny_write.app.data',
      value: JSON.stringify({
        text: state.text,
        light: !state.light,
        theme: theme,
      }),
    }],
    [send, {event: 'theme', data: theme}],
  ]]
]

export const ToggleBackground = (state: State) => [
  {...state, light: !state.light},
  [setItem, {
    key: 'tiny_write.app.data',
    value: JSON.stringify({
      text: state.text,
      light: !state.light,
      theme: state.theme,
    }),
  }],
]

export const OnTextChange = (state: State, text: string) => [
  {...state, text},
  [setItem, {
    key: 'tiny_write.app.data',
    value: JSON.stringify({
      text: text,
      light: state.light,
      theme: state.theme,
    }),
  }],
]
