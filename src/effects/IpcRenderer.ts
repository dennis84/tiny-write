import {Dispatch} from 'hyperapp'

const ipcRenderer = (window as any).require('electron').ipcRenderer

interface Props {
  event: string,
  action: any,
}

export const on = (args: Props, dispatch: Dispatch) => {
  ipcRenderer.on(args.event, (e, arg) => {
    dispatch(args.action, arg)
  })
}

interface SendProps {
  event: string,
  data: any,
}

export const send = (args: SendProps, dispatch: Dispatch) => {
  ipcRenderer.send(args.event, args.data)
}
