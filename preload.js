const {ipcRenderer, contextBridge} = require('electron')

contextBridge.exposeInMainWorld('app', {
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('setAlwaysOnTop', flag),
  setSimpleFullScreen: (flag) => ipcRenderer.invoke('setSimpleFullScreen', flag),
  isSimpleFullScreen: () => ipcRenderer.invoke('isSimpleFullScreen'),
  copyToClipboard: (text) => ipcRenderer.invoke('copyToClipboard', text),
  quit: () => ipcRenderer.invoke('quit'),
  fileExists: (src) => ipcRenderer.invoke('fileExists', src),
  readFile: (src) => ipcRenderer.invoke('readFile', src),
  writeFile: (file, content) => ipcRenderer.invoke('writeFile', file, content),
})
