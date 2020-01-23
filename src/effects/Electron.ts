import {Dispatch} from 'hyperapp'

const userAgent = window.navigator.userAgent.toLowerCase()
const isElectron = userAgent.indexOf(' electron/') > -1

interface UpdateMenuProps {
  fn: (dispatch: Dispatch) => any[];
}

export const updateMenu = (dispatch: Dispatch, props: UpdateMenuProps) => {
  if (!isElectron) return
  const { app, Menu } = require('electron').remote
  const root = new Menu()
  props.fn(dispatch).forEach(x => root.append(x))
  app.applicationMenu = root
}
