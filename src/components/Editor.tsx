import {h} from 'hyperapp'
import {Delta} from 'quill'
import {Config} from '..'
import {freestyle, rgb, rgba} from '../styles'
import {background, color, font, codeTheme} from '../config'
import {create} from '../utils/quill'
import {OnTextChange} from '../actions'

const container = (config: Config) => freestyle.registerStyle({
  'width': '100%',
  'height': '100%',
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

const editor = (config: Config) => freestyle.registerStyle({
  'height': '100%',
  'width': '100%',
  'max-width': '800px',
  'font-size': '24px',
  'font-family': font(config),
  'color': rgb(color(config)),
  '.ql-editor': {
    'min-height': 'calc(100% - 100px)',
    'margin-top': '50px',
    'padding-bottom': '100px',
    'outline': 'none',
    'line-height': '160%',
    'background': 'transparent',
    '-webkit-app-region': 'no-drag',
    '&::-webkit-scrollbar': {
      'display': 'none',
    },
    '&.ql-blank::before': {
      'content': 'attr(data-placeholder)',
      'color': rgba(color(config), 0.5),
      'position': 'absolute',
    },
    'p': {
      'margin': '0',
    },
    'blockquote': {
      'border-left': `10px solid ${rgba(color(config), 0.2)}`,
      'margin': '0',
      'padding-left': '20px',
    },
    'code': {
      'border': `1px solid ${rgba(color(config), 0.5)}`,
      'background': rgba(color(config), 0.1),
      'border-radius': '2px',
      'padding': '2px',
    }
  },
  '.ql-clipboard': {
    'left': '-100000px',
    'height': '1px',
    'overflow-y': 'hidden',
    'position': 'absolute',
    'top': '50%',
  },
})

interface Props {
  text: Delta;
  lastModified: Date,
  config: Config;
}

const OnCreate = (state, e) => {
  e.target.quill = create(e.target, state.text)
  e.target.quill.currentDelta = state.text
  return state
}

const OnChange = (state, e) => {
  e.target.quill.currentDelta =  e.detail.delta
  return OnTextChange(state, e.detail.delta)
}

const OnUpdate = (state, e) => {
  if (!e.target.quill) {
    return state
  }

  const theme = codeTheme(state.config)
  if (e.target.quill.codeTheme !== theme) {
    e.target.querySelectorAll('.CodeMirror').forEach((elem) => {
      (elem as any).CodeMirror.setOption('theme', theme)
    })

    e.target.quill.codeTheme = theme
  }

  if (e.target.quill.currentDelta !== state.text) {
    e.target.quill.setContents(state.text)
  }

  return state
}

export default (props: Props) => (
  <div class={container(props.config)}>
    <with-hooks
      class={editor(props.config)}
      data-placeholder="Start typing..."
      data-theme={codeTheme(props.config)}
      data-watch={`${props.lastModified.toISOString()} ${codeTheme(props.config)}`}
      oncreate={OnCreate}
      onupdate={OnUpdate}
      onchange={OnChange}
    />
  </div>
)
