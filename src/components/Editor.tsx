import {h} from 'hyperapp'
import {State, Config} from '..'
import {freestyle} from '../styles'
import {OnTextChange} from '../actions'
import {MarkdownEditor} from './MarkdownEditor'

(window as any).customElements.define(
  'markdown-editor',
  MarkdownEditor,
  {extends: 'div'}
)

const editor = (config: Config) => freestyle.registerStyle({
  'width': '100%',
  'min-height': 'calc(100vh - 50px)',
  'max-height': 'calc(100vh - 50px)',
  'overflow-y': 'auto',
  'position': 'relative',
  'padding': '0 50px',
  'display': 'flex',
  'justify-content': 'center',
  '&:before': {
    'content': '""',
    'height': '50px',
    'width': '100%',
    'background': config.light ?
      'linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0))' :
      'linear-gradient(to bottom, rgba(60,69,86,1), rgba(60,69,86,0))',
    'position': 'fixed',
    'z-index': '1',
    'pointer-events': 'none',
  },
  '&:after': {
    'content': '""',
    'height': '20px',
    'width': '100%',
    'background': config.light ?
      'linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0))' :
      'linear-gradient(to top, rgba(60,69,86,1), rgba(60,69,86,0))',
    'position': 'fixed',
    'z-index': '1',
    'bottom': '50px',
    'pointer-events': 'none',
  },
})

const textarea = (config: Config) => freestyle.registerStyle({
  'height': '100%',
  'width': '100%',
  'max-width': '800px',
  'font-size': '24px',
  'font-family': config.font,
  'margin': '50px 0',
  'padding-bottom': '100px',
  'border': '0',
  'color': config.light ? '#4a4a4a' : '#fff',
  'line-height': '160%',
  'background': 'transparent',
  'outline': 'none',
  '-webkit-app-region': 'no-drag',
  '&:empty::before': {
    'content': 'attr(placeholder)',
    'color': '#999',
  },
  '&::-webkit-scrollbar': {
    'display': 'none',
  },
  '& blockquote': {
    'border-left': '10px solid #eee',
    'margin': '0',
    'padding-left': '20px',
  }
})

interface Props {
  text: string,
  config: Config,
}

const OnChange = (state: State, e: CustomEvent) => {
  return OnTextChange(state, e.detail.content)
}

export default (props: Props) => (
  <div class={editor(props.config)}>
    <div is="markdown-editor"
      contenteditable
      theme={props.config.theme}
      class={textarea(props.config)}
      placeholder="Start typing..."
      onchange={OnChange}
    >{props.text}</div>
  </div>
)
