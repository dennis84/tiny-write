import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionSource,
  startCompletion,
} from '@codemirror/autocomplete'
import {insertNewlineAndIndent} from '@codemirror/commands'
import {LSPPlugin} from '@codemirror/lsp-client'
import {Compartment, EditorState, type Extension, Prec} from '@codemirror/state'
import {keymap} from '@codemirror/view'
import type * as lsp from 'vscode-languageserver-protocol'

interface InlineCompletionItem {
  insertText: string
  range: lsp.Range
}

interface InlineCompletionList {
  items: InlineCompletionItem[]
}

const acConfig = new Compartment()

export function copilotCompletion(): Extension {
  const data = [{autocomplete: serverCompletionSource}]
  const result = [
    Prec.high(enterStartsCompletion),
    acConfig.of(autocompletion({})),
    EditorState.languageData.of(() => data),
  ]
  return result
}

const enterStartsCompletion = keymap.of([
  {
    key: 'Enter',
    run(view) {
      // Keep normal Enter behavior
      if (!insertNewlineAndIndent(view)) return false

      // Temporarily force AI-only source
      view.dispatch({
        effects: acConfig.reconfigure(autocompletion({override: [serverCompletionSource]})),
      })

      // Trigger completion after newline insertion
      startCompletion(view)

      // Restore normal completion config (languageData etc.)
      queueMicrotask(() => {
        view.dispatch({effects: acConfig.reconfigure(autocompletion())})
      })

      return true
    },
  },
])

function getCompletions(
  plugin: LSPPlugin,
  pos: number,
  context: lsp.CompletionContext,
  abort?: CompletionContext,
) {
  plugin.client.sync()
  const params: lsp.CompletionParams = {
    position: plugin.toPosition(pos),
    textDocument: {uri: plugin.uri},
    context,
  }
  if (abort) abort.addEventListener('abort', () => plugin.client.cancelRequest(params))
  return plugin.client.request<lsp.CompletionParams, InlineCompletionList>(
    'textDocument/inlineCompletion',
    params,
  )
}

function shouldTriggerCompletion(character: string): 'identifier' | 'triggerCharacter' | null {
  const triggers = ['.', '"', "'", '`', '/', '@', '<', '#', ' ', '*']
  if (triggers && triggers.indexOf(character) > -1) return 'triggerCharacter'
  if (/[a-zA-Z_]/.test(character)) return 'identifier'
  return null
}

export const serverCompletionSource: CompletionSource = (context) => {
  const plugin = context.view && LSPPlugin.get(context.view)
  if (!plugin) return null

  const triggerChar = context.state.sliceDoc(context.pos - 1, context.pos)
  const triggerReason = context.explicit ? 'invoked' : shouldTriggerCompletion(triggerChar)
  if (!triggerReason) return null

  const completionContext: lsp.CompletionContext =
    triggerReason === 'triggerCharacter'
      ? {triggerKind: 2 /* TriggerCharacter */, triggerCharacter: triggerChar}
      : {triggerKind: 1 /* Invoked */}

  return getCompletions(plugin, context.pos, completionContext, context).then((result) => {
    const {from, to} = completionResultRange(context, result)
    return {
      from,
      to,
      options: result.items.map<Completion>((item, i) => ({
        label: item.insertText ?? '',
        type: 'copilot',
        boost: i + 1000,
      })),
    }
  })
}

function completionResultRange(cx: CompletionContext, result: any): {from: number; to: number} {
  if (!result.items.length) return {from: cx.pos, to: cx.pos}
  const item0 = result.items[0]
  const range = item0.range
  const line = cx.state.doc.lineAt(cx.pos)
  return {from: line.from + range.start.character, to: line.from + range.end.character}
}
