const {app, ipcMain, shell, BrowserWindow, Menu} = require('electron')
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
    width: 600,
    height: 600,
    frame: false,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.loadURL(url.format({
    protocol: 'file',
    hash: '',
    pathname: path.join(__dirname, '/index.html')
  }))

  Menu.setApplicationMenu(Menu.buildFromTemplate([{label: ''}]))

  if (process.env.NODE_ENV === 'dev') {
    win.webContents.openDevTools()
  }

  win.on('closed', () => {
    win = null
  })

  win.on('blur', () => {
    win.setOpacity(0.3)
  })

  win.on('focus', () => {
    win.setOpacity(1)
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
