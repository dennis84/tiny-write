import {State} from '.'
import {setItem} from './effects/LocalStorage'

export const UpdateState = (state: State, data: string) => {
  const parsed = JSON.parse(data)
  return {...state, text: parsed.text, light: parsed.light}
}

export const ToggleBackground = (state: State) => [
  {...state, light: !state.light},
  [setItem, {
    key: 'tiny_write.app.data',
    value: JSON.stringify({text: state.text, light: !state.light}),
  }],
]

export const OnTextChange = (state: State, text: string) => [
  {...state, text},
  [setItem, {
    key: 'tiny_write.app.data',
    value: JSON.stringify({text: text, light: state.light}),
  }],
]
