import {Dispatch} from 'hyperapp'

const ipcRenderer = (window as any).require('electron').ipcRenderer

interface Props {
  event: string,
  action: any,
}

export const on = (args: Props, dispatch: Dispatch) => {
  ipcRenderer.on(args.event, (e) => {
    dispatch(args.action, e)
  })
}
