import {ipcRenderer, contextBridge} from 'electron'
import {Args, FileInfo} from './src/shared'

export interface Preload {
  setAlwaysOnTop: (flag: boolean) => Promise<void>;
  setSimpleFullScreen: (flag: boolean) => Promise<void>;
  isSimpleFullScreen: () => Promise<boolean>;
  copyToClipboard: (text: string) => Promise<void>;
  quit: () => Promise<void>;
  fileExists: (str: string) => Promise<boolean>;
  isImage: (str: string) => Promise<boolean>;
  save: (content: string) => Promise<string>;
  readFile: (str: string) => Promise<FileInfo>;
  writeFile: (file: string, content: string) => Promise<void>;
  getArgs: () => Promise<Args>;
  resolve: (base: string, src: string) => Promise<string>;
  log: (...args: any) => void;
  on: (name: string, fn: (...args: any) => void) => void;
}

const preload: Preload = {
  setAlwaysOnTop: (flag: boolean) => ipcRenderer.invoke('setAlwaysOnTop', flag),
  setSimpleFullScreen: (flag: boolean) => ipcRenderer.invoke('setSimpleFullScreen', flag),
  isSimpleFullScreen: () => ipcRenderer.invoke('isSimpleFullScreen'),
  copyToClipboard: (text: string) => ipcRenderer.invoke('copyToClipboard', text),
  quit: () => ipcRenderer.invoke('quit'),
  fileExists: (src: string) => ipcRenderer.invoke('fileExists', src),
  isImage: (src: string) => ipcRenderer.invoke('isImage', src),
  save: (content: string) => ipcRenderer.invoke('save', content),
  readFile: (src: string) => ipcRenderer.invoke('readFile', src),
  writeFile: (file: string, content: string) => ipcRenderer.invoke('writeFile', file, content),
  getArgs: () => ipcRenderer.invoke('getArgs'),
  resolve: (base: string, src: string) => ipcRenderer.invoke('resolve', base, src),
  log: (...args: any) => ipcRenderer.invoke('log', ...args),
  on: (name: string, fn: (...args: any) => void) => {
    ipcRenderer.on(name, (_, ...args) => fn(...args))
  }
}

contextBridge.exposeInMainWorld('app', preload)
