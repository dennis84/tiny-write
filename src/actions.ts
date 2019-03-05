import {State} from '.'
import {setItem} from './effects/LocalStorage'

export const UpdateText = (state: State, text: string) =>
  ({...state, text: text})

export const OnTextChange = (state: State, text: string, position: number) => [
  {...state, text, position},
  [setItem, {key: 'tiny_write.app.text', value: text}],
]
