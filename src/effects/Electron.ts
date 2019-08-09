import {Dispatch} from 'hyperapp'

const userAgent = window.navigator.userAgent.toLowerCase()
const isElectron = userAgent.indexOf(' electron/') > -1

interface UpdateMenuProps {
  fn: (dispatch: Dispatch) => any[],
}

export const updateMenu = (dispatch: Dispatch, args: UpdateMenuProps) => {
  if (!isElectron) return
  const remote = (window as any).require('electron').remote
  const {Menu} = remote
  const root = new Menu()
  args.fn(dispatch).forEach(x => root.append(x))
  remote.app.setApplicationMenu(root)
}

export const reload = () => {
  if (isElectron) {
    const remote = (window as any).require('electron').remote
    const win = remote.getCurrentWindow()
    win.reload()
  } else {
    window.location.reload()
  }
}
