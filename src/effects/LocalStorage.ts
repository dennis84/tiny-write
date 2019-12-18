import {Dispatch} from 'hyperapp'

interface GetProps {
  action: any;
  key: string;
}

export const getItem = (dispatch: Dispatch, args: GetProps) => {
  const value = window.localStorage.getItem(args.key)
  dispatch(args.action, value)
}

interface SetProps {
  key: string;
  value: string;
}

export const setItem = (dispatch: Dispatch, args: SetProps) => {
  window.localStorage.setItem(args.key, args.value)
}
