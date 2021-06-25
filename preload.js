const {ipcRenderer, contextBridge} = require('electron')

contextBridge.exposeInMainWorld('app', {
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('setAlwaysOnTop', flag),
  setSimpleFullScreen: (flag) => ipcRenderer.invoke('setSimpleFullScreen', flag),
  isSimpleFullScreen: () => ipcRenderer.invoke('isSimpleFullScreen'),
  copyToClipboard: (text) => ipcRenderer.invoke('copyToClipboard', text),
  quit: () => ipcRenderer.invoke('quit'),
  fileExists: (src) => ipcRenderer.invoke('fileExists', src),
  isImage: (src) => ipcRenderer.invoke('isImage', src),
  save: (content) => ipcRenderer.invoke('save', content),
  readFile: (src) => ipcRenderer.invoke('readFile', src),
  writeFile: (file, content) => ipcRenderer.invoke('writeFile', file, content),
  getArgs: () => ipcRenderer.invoke('getArgs'),
  resolve: (base, src) => ipcRenderer.invoke('resolve', base, src),
  log: (...args) => ipcRenderer.invoke('log', ...args),
  on: (name, fn) => {
    ipcRenderer.on(name, (event, ...args) => fn(...args))
  }
})
