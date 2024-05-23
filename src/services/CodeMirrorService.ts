import {Store} from 'solid-js/store'
import {EditorView, drawSelection, highlightActiveLine, keymap, lineNumbers} from '@codemirror/view'
import {Compartment, EditorState, Extension} from '@codemirror/state'
import {defaultKeymap, indentWithTab} from '@codemirror/commands'
import {autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap} from '@codemirror/autocomplete'
import {bracketMatching, foldGutter, foldKeymap, indentOnInput, indentUnit} from '@codemirror/language'
import {linter} from '@codemirror/lint'
import {getTheme} from '@/codemirror/theme'
import {highlight} from '@/codemirror/highlight'
import {findWords, tabCompletionKeymap} from '@/codemirror/completion'
import {mermaidKeywords} from '@/codemirror/mermaid'
import {Mode, State} from '@/state'
import {Ctrl} from '.'

interface CreateEditor {
  lang?: string;
  parent?: HTMLElement;
  doc?: string;
  extensions?: Extension[];
}

export class CodeMirrorService {
  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
  ) {}

  createEditor(props: CreateEditor) {
    const compartments = {
      lang: new Compartment,
      findWords: new Compartment,
      keywords: new Compartment,
    }

    const theme = getTheme(this.ctrl.config.codeTheme.value)
    const langSupport = highlight(props.lang ?? 'js')

    const extensions = [
      ...props.extensions ?? [],
      keymap.of(closeBracketsKeymap),
      keymap.of(foldKeymap),
      keymap.of([
        ...defaultKeymap,
        ...completionKeymap,
        ...tabCompletionKeymap,
        indentWithTab,
      ]),
      theme,
      drawSelection(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      linter(() => []),
      EditorState.tabSize.of(this.ctrl.config.prettier.tabWidth),
      indentUnit.of(
        this.ctrl.config.prettier.useTabs ?
          '\t' :
          ' '.repeat(this.ctrl.config.prettier.tabWidth)
      ),
      autocompletion(),
      foldGutter(),
      EditorView.lineWrapping,
      compartments.lang.of(langSupport),
      compartments.findWords.of(langSupport.language.data.of({autocomplete: findWords})),
    ]

    if (props.lang === 'mermaid') {
      extensions.push(compartments.keywords.of(langSupport.language.data.of({autocomplete: mermaidKeywords})))
    }

    if (this.store.mode === Mode.Code) {
      extensions.push([
        highlightActiveLine(),
        lineNumbers()
      ])
    }

    const editorView = new EditorView({
      parent: props.parent,
      doc: props.doc,
      extensions,
    })

    return {editorView, compartments}
  }
}
