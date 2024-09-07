import {Store} from 'solid-js/store'
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
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
import {linter} from '@codemirror/lint'
import {getTheme} from '@/codemirror/theme'
import {highlight} from '@/codemirror/highlight'
import {findWords, tabCompletionKeymap} from '@/codemirror/completion'
import {mermaidKeywords} from '@/codemirror/mermaid'
import {Mode, State} from '@/state'
import {ConfigService} from './ConfigService'
import {AppService} from './AppService'

interface CreateEditor {
  lang?: string
  parent?: Element
  doc?: string
  extensions?: Extension[]
}

export class CodeMirrorService {
  constructor(
    private configService: ConfigService,
    private appService: AppService,
    private store: Store<State>,
  ) {}

  createEditor(props: CreateEditor) {
    const compartments = {
      lang: new Compartment(),
      findWords: new Compartment(),
      keywords: new Compartment(),
    }

    const theme = getTheme(this.configService.codeTheme.value)
    const langSupport = highlight(props.lang ?? 'js')

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
      EditorState.tabSize.of(this.configService.prettier.tabWidth),
      indentUnit.of(
        this.configService.prettier.useTabs ?
          '\t'
        : ' '.repeat(this.configService.prettier.tabWidth),
      ),
      autocompletion(),
      foldGutter(),
      EditorView.lineWrapping,
      compartments.lang.of(langSupport),
      compartments.findWords.of(langSupport.language.data.of({autocomplete: findWords})),
    ]

    if (props.lang === 'mermaid') {
      extensions.push(
        compartments.keywords.of(langSupport.language.data.of({autocomplete: mermaidKeywords})),
      )
    }

    if (this.store.mode === Mode.Code) {
      extensions.push([highlightActiveLine(), lineNumbers()])
    }

    const editorView = new EditorView({
      parent: props.parent,
      doc: props.doc,
      extensions,
    })

    return {editorView, compartments}
  }
}
