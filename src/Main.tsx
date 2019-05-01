import {h} from 'hyperapp'
import {freestyle} from './styles'
import {insertCss} from 'insert-css'
import {State, Config} from '.'
import Editor from './components/Editor'
import WordCount from './components/WordCount'

const container = (config: Config) => freestyle.registerStyle({
  'background': config.light ? '#fff' : '#3C4556',
  'width': '100%',
  'height': '100%',
  'font-family': config.font,
})

class FreeStyle extends HTMLElement {
  static get observedAttributes() {
    return ['content']
  }

  attributeChangedCallback(name, oldValue, newValue) {
    insertCss(newValue)
  }
}

(window as any).customElements.define('free-style', FreeStyle)

export default (props: State) => (
  <div class={container(props.config)}>
    <Editor text={props.text} config={props.config} />
    <WordCount text={props.text} config={props.config} />
    <free-style content={freestyle.getStyles()}></free-style>
  </div>
)
