import {EditorState} from '@codemirror/state'
import {inlineSuggestion} from 'codemirror-extension-inline-suggestion'
import {copilotCompletion} from '@/remote/copilot'
import {readText, replaceText} from '@/remote/editor'

interface Options {
  configure: () => {path: string, language: string}
}

export const copilot = (options: Options) => {
  const fetchSuggestion = async (editorState: EditorState) => {
    const {path, language} = options.configure()

    if (path.startsWith('buffer://')) {
      const text = editorState.doc.toString()
      await readText(path)
      await replaceText(path, {text, language})
    }

    const result = (await copilotCompletion(path, editorState.selection.main.head)) as any
    return result?.completions?.[0]?.displayText
  }

  return inlineSuggestion({
    fetchFn: fetchSuggestion,
    delay: 1000,
  })
}
