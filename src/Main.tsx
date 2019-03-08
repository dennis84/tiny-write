import {h} from 'hyperapp'
import {freestyle} from './styles'
import {State} from '.'
import Editor from './components/Editor'
import WordCount from './components/WordCount'

const container = freestyle.registerStyle({
  'color': '#4a4a4a',
  'width': '100%',
  'height': '100%',
})

export default (props: State) => (
  <div class={container}>
    <Editor text={props.text} />
    <WordCount text={props.text} />
  </div>
)
