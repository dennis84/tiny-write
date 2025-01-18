import {Store} from 'solid-js/store'
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  hoverTooltip,
  keymap,
  lineNumbers,
  tooltips,
} from '@codemirror/view'
import {Compartment, EditorState, Extension} from '@codemirror/state'
import {defaultKeymap, indentWithTab} from '@codemirror/commands'
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete'
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
} from '@codemirror/language'
import {linter, setDiagnostics} from '@codemirror/lint'
import {getTheme} from '@/codemirror/theme'
import {getLanguageConfig, LangConfig} from '@/codemirror/highlight'
import {findWords, tabCompletionKeymap} from '@/codemirror/completion'
import {mermaidKeywords} from '@/codemirror/mermaid'
import {lspCompletionSource} from '@/codemirror/lsp-completion'
import {lspHoverSource} from '@/codemirror/lsp-hover'
import {Mode, PrettierConfig, State} from '@/state'
import {isTauri} from '@/env'
import {ConfigService} from './ConfigService'
import {AppService} from './AppService'
import {PrettierService} from './PrettierService'

interface CreateEditor {
  lang?: string
  parent?: Element
  doc?: string
  extensions?: Extension[]
  path?: string
  selection?: {anchor: number; head?: number}
}

export class CodeMirrorService {
  constructor(
    private configService: ConfigService,
    private appService: AppService,
    private prettierService: PrettierService,
    private store: Store<State>,
  ) {}

  static replaceSlice(doc: string, slice: string, range: [number, number]): string {
    const docArr = CodeMirrorService.stringToUtf16Array(doc)
    const sliceArr = CodeMirrorService.stringToUtf16Array(slice)

    return CodeMirrorService.utf16ArrayToString([
      ...docArr.slice(0, range[0]),
      ...sliceArr,
      ...docArr.slice(range[1]),
    ])
  }

  createEditor(props: CreateEditor) {
    const compartments = {
      lang: new Compartment(),
      findWords: new Compartment(),
      keywords: new Compartment(),
      lsp: new Compartment(),
    }

    const theme = getTheme(this.configService.codeTheme.value)
    const lang = getLanguageConfig(props.lang)
    const langSupport = lang.highlight()
    const [tabWidth, indentString] = this.getIndentConfig(props.lang, lang)

    const extensions = [
      ...(props.extensions ?? []),
      keymap.of(closeBracketsKeymap),
      keymap.of(foldKeymap),
      keymap.of([...defaultKeymap, ...completionKeymap, ...tabCompletionKeymap, indentWithTab]),
      theme,
      tooltips({parent: this.appService.layoutRef}),
      drawSelection(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      linter(() => []),
      EditorState.tabSize.of(tabWidth),
      indentUnit.of(indentString),
      autocompletion({
        override: props.path && isTauri() ? [lspCompletionSource(props.path)] : undefined,
      }),
      EditorView.lineWrapping,
    ]

    extensions.push([
      compartments.lang.of(langSupport),
      compartments.findWords.of(langSupport.language.data.of({autocomplete: findWords})),
    ])

    if (props.lang === 'mermaid') {
      extensions.push(
        compartments.keywords.of(langSupport.language.data.of({autocomplete: mermaidKeywords})),
      )
    }

    if (this.store.mode === Mode.Code) {
      extensions.push([highlightActiveLine(), highlightActiveLineGutter(), lineNumbers()])
    }

    if (props.path && isTauri()) {
      extensions.push([hoverTooltip(lspHoverSource(props.path), {hoverTime: 600})])
    }

    if (this.store.mode !== Mode.Canvas) {
      extensions.push(
        foldGutter({
          markerDOM: (open) => {
            const el = document.createElement('span')
            el.classList.add('icon')
            el.textContent = 'chevron_right'
            el.style.fontSize = '14px'
            el.style.lineHeight = 'inherit'
            if (open) el.classList.add('rot-90')
            return el
          },
        }),
      )
    }

    const editorView = new EditorView({
      parent: props.parent,
      doc: props.doc,
      extensions,
      selection: props.selection,
    })

    return {editorView, compartments}
  }

  async format(view: EditorView, lang: string, config: PrettierConfig) {
    try {
      const doc = view.state.doc.toString()
      const value = await this.prettierService.format(doc, lang, config)
      view.focus() // otherwise update is not forwarded to PM
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: value.substring(0, value.lastIndexOf('\n')),
        },
      })
    } catch (err: any) {
      if (!err.loc?.start?.line) return
      const line = view.state.doc.line(err.loc.start.line)
      const lines = err.message.split('\n')
      const diagnostics = lines.map((message: string) => ({
        from: line.from + err.loc.start.column - 1,
        to: line.from + err.loc.start.column - 1,
        severity: 'error',
        message: message,
      }))

      view.dispatch(setDiagnostics(view.state, diagnostics))
    }
  }

  private getIndentConfig(lang: string = '', langConfig: LangConfig): [number, string] {
    if (this.prettierService.supports(lang)) {
      return [
        this.configService.prettier.tabWidth,
        this.configService.prettier.useTabs ?
          '\t'
        : ' '.repeat(this.configService.prettier.tabWidth),
      ]
    }

    return [1, langConfig.indentUnit ?? '  ']
  }

  private static stringToUtf16Array(str: string): number[] {
    const utf16Array = []
    for (let i = 0; i < str.length; i++) {
      utf16Array.push(str.charCodeAt(i))
    }
    return utf16Array
  }

  private static utf16ArrayToString(utf16Array: number[]): string {
    return String.fromCharCode(...utf16Array)
  }
}
