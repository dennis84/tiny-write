import {
  EditorView,
  ViewPlugin,
  ViewUpdate,
  crosshairCursor,
  drawSelection,
  keymap,
  tooltips,
} from '@codemirror/view'
import {Extension} from '@codemirror/state'
import {standardKeymap} from '@codemirror/commands'
import {language} from '@codemirror/language'
import {acceptCompletion, autocompletion, moveCompletionSelection} from '@codemirror/autocomplete'
import {languages} from '@/codemirror/highlight'
import * as logos from '@/codemirror/logos'
import {getTheme} from '@/codemirror/theme'
import {CodeBlockView} from './CodeBlockView'

interface Config {
  onClose: () => void;
  onChange: (lang: string) => void;
}

export const createChangeLangPlugin = (codeBlock: CodeBlockView, config: Config) =>
  ViewPlugin.fromClass(class {
    toggle!: HTMLElement
    input!: HTMLElement
    inputEditor!: LangInputEditor
    lang: string = codeBlock.lang

    constructor(private view: EditorView) {
      const theme = getTheme(codeBlock.ctrl.config.codeTheme.value)

      this.toggle = document.createElement('div')
      this.toggle.className = 'lang-toggle'

      this.input = document.createElement('div')
      this.input.className = 'lang-input'
      this.input.style.display = 'none'

      this.inputEditor = new LangInputEditor({
        theme,
        doc: this.lang,
        parent: this.input,
        codeBlock,
        onClose: () => {
          this.input.style.display = 'none'
          this.toggle.style.display = 'flex'
          config.onClose()
        },
        onEnter: (lang) => {
          this.input.style.display = 'none'
          this.toggle.style.display = 'flex'
          config.onChange(lang)
        },
      })

      this.toggle.addEventListener('click', () => {
        this.toggle.style.display = 'none'
        this.input.style.display = 'flex'
        this.inputEditor.focus()
      })

      this.view.dom.prepend(this.input)
      this.view.dom.appendChild(this.toggle)
      this.updateDOM()
    }

    destroy() {
      this.toggle.remove()
      this.input.remove()
      this.inputEditor?.destroy()
    }

    update(update: ViewUpdate) {
      if (update.transactions[0]?.isUserEvent('change-lang')) {
        this.toggle.style.display = 'none'
        this.input.style.display = 'flex'
        this.inputEditor.focus()
        return
      }

      if (
        update.docChanged ||
        update.startState.facet(language) != update.state.facet(language)
      ) {
        this.lang = codeBlock.lang
        this.updateDOM()
      }
    }

    private updateDOM() {
      const lang = this.lang as string
      codeBlock.dom.dataset.lang = lang
      const cur = this.toggle?.children[0]?.getAttribute('title')
      if (cur === lang) return

      const l: any = logos
      if (l[lang]) {
        const img = document.createElement('img')
        img.src = l[lang]
        img.setAttribute('title', lang)
        this.toggle.innerHTML = ''
        this.toggle.appendChild(img)
      } else {
        this.toggle.style.display = 'none'
        this.toggle.innerHTML = ''
      }
    }
  })

interface Props {
  doc: string;
  parent: Element;
  theme: Extension;
  onClose: () => void;
  onEnter: (lang: string) => void;
  codeBlock: CodeBlockView;
}

export class LangInputEditor {
  private view: EditorView
  private doc: string

  constructor(private props: Props) {
    this.doc = this.props.doc
    this.view = new EditorView({
      doc: this.props.doc,
      parent: this.props.parent,
      extensions: [
        tooltips({parent: this.props.codeBlock.ctrl.app.layoutRef}),
        props.theme,
        drawSelection(),
        crosshairCursor(),
        autocompletion({
          defaultKeymap: false,
          override: [() => ({
            options: Object.keys(languages).map((label) => ({label, type: 'word'})),
            from: 0,
          })]
        }),
        EditorView.domEventHandlers({
          'blur': () => {
            this.reset()
            this.props.onClose()
            return true
          }
        }),
        keymap.of([
          {
            key: 'ArrowDown',
            run: moveCompletionSelection(true),
          },
          {
            key: 'ArrowUp',
            run: moveCompletionSelection(false),
          },
          {
            key: 'Enter',
            run: (editorView) => {
              acceptCompletion(editorView)
              const lang = editorView.state.doc.lineAt(0).text.trim()
              this.doc = lang
              this.props.onEnter(lang)
              return true
            },
          }, {
            key: 'Escape',
            run: () => {
              this.reset()
              this.props.onClose()
              return true
            }
          },
          ...standardKeymap,
        ])
      ],
    })
  }

  destroy() {
    this.view.destroy()
  }

  focus() {
    this.view.focus()
    this.view.dispatch({
      selection: {anchor: 0, head: this.view.state.doc.length}
    })
  }

  containsElem(elem: Element) {
    return this.view.dom.contains(elem)
  }

  private reset() {
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: this.doc,
      }
    })
  }
}
