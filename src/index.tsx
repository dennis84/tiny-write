import {render} from 'solid-js/web'
import Main from './Main'
import {newState} from './state'

render(
  () => <Main state={newState()} />,
  document.getElementById('container')
)
