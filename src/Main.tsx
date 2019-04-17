import {h} from 'hyperapp'
import {freestyle} from './styles'
import {insertCss} from 'insert-css'
import {State} from '.'
import Editor from './components/Editor'
import WordCount from './components/WordCount'

const container = (light: boolean) => freestyle.registerStyle({
  'background': light ? '#fff' : '#3C4556',
  'width': '100%',
  'height': '100%',
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
  <div class={container(props.light)}>
    <Editor text={props.text} light={props.light} />
    <WordCount text={props.text} light={props.light} />
    <free-style content={freestyle.getStyles()}></free-style>
  </div>
)
