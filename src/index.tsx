import {render} from 'solid-js/web'
import Main from '@/Main'
import {createState} from '@/state'

render(
  () => <Main state={createState()} />,
  document.getElementById('container')
)
