import {Dispatch} from 'hyperapp'

interface GetProps {
  action: any,
  key: string,
}

export const getItem = (args: GetProps, dispatch: Dispatch) => {
  const value = window.localStorage.getItem(args.key)
  dispatch(args.action, value)
}

interface SetProps {
  key: string,
  value: string,
}

export const setItem = (args: SetProps, dispatch: Dispatch) => {
  window.localStorage.setItem(args.key, args.value)
}
