import {h} from 'hyperapp'
import {freestyle, rgb} from './styles'
import {background, font} from './config'
import {insertCss} from 'insert-css'
import {State, Config} from '.'
import Editor from './components/Editor'
import StatusLine from './components/StatusLine'
import Notification from './components/Notification'
import {WithHooks} from './components/WithHooks'

(window as any).customElements.define('with-hooks', WithHooks)

const container = (config: Config) => freestyle.registerStyle({
  'display': 'block',
  'background': rgb(background(config)),
  'width': '100%',
  'height': '100%',
  'font-family': font(config),
})

const InsertCss = (state, e) => {
  insertCss(freestyle.getStyles())
  return state
}

export default (props: State) => (
  <with-hooks
    class={container(props.config)}
    oncreate={InsertCss}
    onupdate={InsertCss}
    data-watch={`${props.config.theme} ${props.config.font}`}>
    <Editor
      text={props.text}
      config={props.config}
      lastModified={props.lastModified} />
    <StatusLine
      text={props.text}
      lastModified={props.lastModified}
      config={props.config} />
    {props.notification ? <Notification notification={props.notification} /> : ''}
  </with-hooks>
)
