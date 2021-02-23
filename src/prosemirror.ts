import {keymap} from 'prosemirror-keymap'
import {NodeSelection} from 'prosemirror-state'
import {ViewPlugin, keymap as cmKeymap} from '@codemirror/view'
import base from './prosemirror/base'
import markdown from './prosemirror/markdown'
import link from './prosemirror/link'
import scroll from './prosemirror/scroll'
import todoList from './prosemirror/todo-list'
import code from './prosemirror/code'
import dropImage from './prosemirror/image'
import placeholder from './prosemirror/placeholder'
import codeBlock, {cleanLang} from './prosemirror/code-block'
import file from './prosemirror/file'
import {Config} from '.'
import {codeTheme} from './config'
import {isElectron} from './env'
import {readFile, writeFile} from './remote'

interface Props {
  data?: unknown;
  keymap?: any;
  config: Config;
}

const customKeymap = (props: Props) => ({
  plugins: (prev) => props.keymap ? [
    ...prev,
    keymap(props.keymap)
  ] : prev
})

const codeMirrorKeymap = (props: Props) => {
  const keys = []
  for (const key in props.keymap) {
    keys.push({key: key, run: props.keymap[key]})
  }

  return cmKeymap.of(keys)
}

const codeMirrorSyncFile = (view, node, getPos) => {
  const i = node.attrs.params.file.lastIndexOf('.')
  const ext = (i < 0) ? '' : node.attrs.params.file.substr(i + 1)
  const lang = cleanLang(ext)

  return ViewPlugin.fromClass(class {
    initialized = false
    update(update) {
      if (!this.initialized) {
        readFile(node.attrs.params.file).then((data) => {
          this.initialized = true
          const tr = view.state.tr
          const text = view.state.schema.text(data.buffer.toString('utf-8'))
          const sel = new NodeSelection(tr.doc.resolve(getPos()))
          tr.replaceRangeWith(sel.$from.pos + 1, sel.$to.pos, text)
          tr.setNodeMarkup(getPos(), undefined, {
            ...node.attrs,
            params: {...node.attrs.params, lang}
          })
          view.dispatch(tr)
        })
      }

      if (!update.docChanged) return
      writeFile(node.attrs.params.file, update.state.doc.toString())
    }
  })
}
export const createState = (props: Props) => ({
  editorState: props.data,
  extensions: [
    base,
    customKeymap(props),
    markdown,
    todoList,
    codeBlock({
      theme: codeTheme(props.config),
      typewriterMode: props.config.typewriterMode,
      fontSize: props.config.fontSize,
      extensions: (view, node, getPos) => [
        codeMirrorKeymap(props),
        ...(node.attrs.params.file ? [codeMirrorSyncFile(view, node, getPos)] : []),
      ],
    }),
    code,
    link,
    dropImage,
    ...(isElectron ? [file] : []),
    placeholder('Start typing ...'),
    scroll(props.config.typewriterMode),
  ]
})

export const createEmptyState = (props: Props) =>
  createState({
    ...props,
    data: {
      doc: {
        type: 'doc',
        content: [{type: 'paragraph'}]
      },
      selection: {
        type: 'text',
        anchor: 1,
        head: 1
      }
    }
  })
