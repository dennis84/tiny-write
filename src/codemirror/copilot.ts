import {EditorState} from '@codemirror/state'
import {inlineSuggestion} from 'codemirror-extension-inline-suggestion'
import {copilotCompletion} from '@/remote/copilot'
import {readText, replaceText} from '@/remote/editor'

interface Config {
  path: string
  language: string
  tabWidth: number
  useTabs: boolean
}

interface Options {
  configure: () => Config
}

export const copilot = (options: Options) => {
  const fetchSuggestion = async (editorState: EditorState) => {
    const {path, language, tabWidth, useTabs} = options.configure()

    if (path.startsWith('buffer://')) {
      const text = editorState.doc.toString()
      await readText(path)
      await replaceText(path, {text, language})
    }

    const result = await copilotCompletion(
      path,
      editorState.selection.main.head,
      tabWidth,
      useTabs,
    )
    return result?.completions?.[0]?.displayText
  }

  return inlineSuggestion({
    fetchFn: fetchSuggestion,
    delay: 1000,
  })
}
