import {render} from 'solid-js/web'
import {Init} from './components/Init'

const container = document.getElementById('container')
if (container) {
  render(() => <Init />, container)
}
