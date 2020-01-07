import {h} from 'hyperapp'
import {State, Config} from '..'
import {freestyle, rgb, rgba} from '../styles'
import {background, color, font, codeTheme} from '../config'
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
    'background': `linear-gradient(to bottom, ${rgba(background(config), 1)}, ${rgba(background(config), 0)})`,
    'position': 'fixed',
    'z-index': '1',
    'pointer-events': 'none',
  },
  '&:after': {
    'content': '""',
    'height': '20px',
    'width': '100%',
    'background': `linear-gradient(to top, ${rgba(background(config), 1)}, ${rgba(background(config), 0)})`,
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
  'font-family': font(config),
  'margin': '50px 0',
  'padding-bottom': '100px',
  'border': '0',
  'color': rgb(color(config)),
  'line-height': '160%',
  'background': 'transparent',
  'outline': 'none',
  '-webkit-app-region': 'no-drag',
  '&:empty::before': {
    'content': 'attr(placeholder)',
    'color': rgba(color(config), 0.5),
  },
  '&::-webkit-scrollbar': {
    'display': 'none',
  },
  '& blockquote': {
    'border-left': '10px solid #eee',
    'margin': '0',
    'padding-left': '20px',
  },
})

interface Props {
  text: string;
  config: Config;
}

const OnChange = (state: State, e: CustomEvent) =>
  (e.detail && e.detail.content != undefined) ?
    OnTextChange(state, e.detail.content) : state

export default (props: Props) => (
  <div class={editor(props.config)}>
    <div is="markdown-editor"
      contenteditable
      class={textarea(props.config)}
      placeholder="Start typing..."
      theme={codeTheme(props.config)}
      content={props.text}
      onchange={OnChange}
    ></div>
  </div>
)
