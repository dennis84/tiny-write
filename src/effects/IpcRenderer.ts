import {Dispatch} from 'hyperapp'

interface IpcRenderer {
  on: (...any) => void,
  send: (...any) => void,
}

const userAgent = window.navigator.userAgent.toLowerCase()
let ipcRenderer: IpcRenderer

if(userAgent.indexOf(' electron/') > -1) {
  ipcRenderer = (window as any).require('electron').ipcRenderer
} else {
  ipcRenderer = {on: () => {}, send: () => {}}
}

interface OnProps {
  event: string,
  action: any,
}

export const on = (args: OnProps, dispatch: Dispatch) => {
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
