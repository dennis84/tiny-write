const {app, shell, BrowserWindow, Menu} = require('electron')
const {autoUpdater} = require('electron-updater')
const path = require('path')
const url = require('url')

let win

function autoUpdate() {
  autoUpdater.checkForUpdatesAndNotify()
}

function createWindow() {
  win = new BrowserWindow({
    title: 'TinyWrite',
    alwaysOnTop: true,
    width: 720,
    height: 720,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      worldSafeExecuteJavaScript: true,
    }
  })

  win.loadURL(url.format({
    protocol: 'file',
    hash: '',
    pathname: path.join(__dirname, '/dist/index.html')
  }))

  Menu.setApplicationMenu(Menu.buildFromTemplate([{
    label: 'Application',
    submenu: [
      {label: 'About Application', selector: 'orderFrontStandardAboutPanel:'},
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => win.close()
      },
    ].concat(
      process.env.NODE_ENV === 'dev' ? [{
        label: 'Open Dev Tools',
        accelerator: 'CmdOrCtrl+Shift+J',
        click: () => win.webContents.openDevTools()
      }] : []
    ),
  }, {
    label: 'Edit',
    submenu: [
      {label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:'},
      {label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:'},
      {type: 'separator'},
      {label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:'},
      {label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:'},
      {type: 'separator'},
      {label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:'},
      {label: 'Paste and match style', accelerator: 'Shift+CmdOrCtrl+V', selector: 'pasteAndMatchStyle:'},
      {label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:'},
    ],
  }]))

  win.on('closed', () => {
    win = null
  })

  win.on('blur', () => {
    win.setOpacity(0.3)
  })

  win.on('focus', () => {
    win.setOpacity(1)
  })

  win.webContents.on('new-window', (e, url) => {
    e.preventDefault()
    shell.openExternal(url)
  })
}

app.on('ready', () => {
  createWindow()
  autoUpdate()
})

app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if(process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if(win === null) {
    createWindow()
  }
})
