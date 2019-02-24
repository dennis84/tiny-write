import {State} from '.'

import {setItem} from './effects/LocalStorage'

export const UpdateText = (state: State, text: string) => [
  {...state, text: text},
  [setItem, {key: 'tiny_write.app.text', value: text}],
]

export const OnTextChange = (state: State, e: Event) =>
  UpdateText(state, (e.target as HTMLTextAreaElement).value)
