import {baseKeymap} from 'prosemirror-commands'
import {buildKeymap} from 'prosemirror-example-setup'
import {inputRules} from 'prosemirror-inputrules'
import {keymap} from 'prosemirror-keymap'
import {EditorState} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import {createSignal, onMount} from 'solid-js'
import {wordCompletionKeymap} from '@/prosemirror/autocomplete/word-completion'
import {codeInputRule, codeKeymap} from '@/prosemirror/code'
import {codeBlockKeymap, createCodeBlockPlugin} from '@/prosemirror/code-block'
import {emphasisInputRules} from '@/prosemirror/emphasis'
import {createInputParserPlugin} from '@/prosemirror/input-parser'
import {createMarkdownParser} from '@/prosemirror/markdown-serialize'
import {createMarkdownPlugins} from '@/prosemirror/markdown-shortcuts'
import {onEnterDoubleNewline} from '@/prosemirror/on-enter-double-newline'
import {createPasteMarkdownPlugin} from '@/prosemirror/paste-markdown'
import {placeholder} from '@/prosemirror/placeholder'
import {schema} from '@/prosemirror/schema'
import {createTablePlugins, tableKeymap} from '@/prosemirror/table'
import {useState} from '@/state'
import {ChatInputEditor} from '../editor/Style'

interface Props {
  content?: string
  setEditorView?: (view: EditorView) => void
  onSubmit?: (state: EditorState) => void
  onFocus?: (focus: boolean) => void
}

export const ChatEditor = (props: Props) => {
  let chatInputRef!: HTMLDivElement

  const {proseMirrorService} = useState()
  const [editorView, setEditorView] = createSignal<EditorView>()

  const onSubmit = () => {
    const view = editorView()
    if (!view) return
    props.onSubmit?.(view.state)
  }

  onMount(() => {
    const plugins = [
      // keymap
      onEnterDoubleNewline(() => onSubmit()),
      wordCompletionKeymap,
      keymap(buildKeymap(schema)),
      keymap(baseKeymap),
      codeBlockKeymap,
      codeKeymap,
      tableKeymap,
      // plugins
      placeholder('Ask Copilot ...'),
      createMarkdownPlugins(schema),
      createCodeBlockPlugin(schema),
      inputRules({rules: [codeInputRule, ...emphasisInputRules]}),
      createInputParserPlugin(createMarkdownParser(schema)),
      createPasteMarkdownPlugin(schema),
      ...createTablePlugins(schema),
    ]

    const {nodeViews} = proseMirrorService.createNodeViews()
    const parser = createMarkdownParser(schema)
    const doc = props.content ? parser.parse(props.content) : undefined
    const state = EditorState.create({doc, schema, plugins})
    const view = new EditorView(chatInputRef, {
      state,
      nodeViews,
      handleDOMEvents: {
        focus: (_view, event) => {
          const target = event.target as Element | null
          if (!target) return false

          if (chatInputRef === target || chatInputRef.contains(target)) {
            props.onFocus?.(true)
          }
        },
        blur: (_view, event) => {
          const target = event.relatedTarget as Element | null
          if (!target) {
            props.onFocus?.(false)
            return false
          }

          if (chatInputRef.contains(target)) {
            return false
          }

          props.onFocus?.(false)
        },
      },
    })

    setEditorView(view)
    props.setEditorView?.(view)

    // Hight is not set correctly without timeout
    setTimeout(() => view.focus(), 50)
  })

  return <ChatInputEditor role="none" ref={chatInputRef} data-testid="chat_input"></ChatInputEditor>
}
