import {State} from '.'

export const save = (state: State) => {
  window.localStorage.setItem('tiny_write.app.data', JSON.stringify(state))
}

export const read = () => {
  return window.localStorage.getItem('tiny_write.app.data')
}
