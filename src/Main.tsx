import {h} from 'hyperapp'
import {freestyle, rgb} from './styles'
import {background, font} from './data'
import {insertCss} from 'insert-css'
import {State, Config} from '.'
import Editor from './components/Editor'
import StatusLine from './components/StatusLine'

const container = (config: Config) => freestyle.registerStyle({
  'background': rgb(background(config)),
  'width': '100%',
  'height': '100%',
  'font-family': font(config),
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
    <StatusLine
      text={props.text}
      lastModified={props.lastModified}
      config={props.config} />
    <free-style content={freestyle.getStyles()}></free-style>
  </div>
)
