import {type CompletionSource, selectedCompletion} from '@codemirror/autocomplete'
import {EditorState, type Extension} from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view'
import {copilotCompletion} from '@/remote/copilot'
import {readText, replaceText} from '@/remote/editor'

interface Config {
  path: string
  language: string
  tabWidth: number
  useTabs: boolean
}

interface Props {
  configure: () => Config
}

export const copilot = (props: Props): Extension[] => {
  const completionSource: CompletionSource = async (context) => {
    const {path, language, tabWidth, useTabs} = props.configure()

    if (path.startsWith('buffer://')) {
      const text = context.state.doc.toString()
      await readText(path)
      await replaceText(path, {text, language})
    }

    const result = await copilotCompletion(
      path,
      context.state.selection.main.head,
      tabWidth,
      useTabs,
    )
    const options = result?.completions.map((item) => {
      return {
        // Replace with: ction example {}
        label: item.displayText,
        // Displayed in the tooltip: function example {}
        displayLabel: item.text,
        type: 'copilot',
        boost: Number.MAX_SAFE_INTEGER,
      }
    })

    return {
      options,
      from: context.pos,
    }
  }

  const data = [{autocomplete: completionSource}]

  return [EditorState.languageData.of(() => data), previewCompetion]
}

class InlineSuggestionWidget extends WidgetType {
  suggestion: string
  constructor(suggestion: string) {
    super()
    this.suggestion = suggestion
  }
  toDOM() {
    const div = document.createElement('span')
    div.style.opacity = '0.4'
    div.className = 'cm-inline-suggestion'
    div.textContent = this.suggestion
    return div
  }
  get lineBreaks() {
    return this.suggestion.split('\n').length - 1
  }
}

const previewCompetion = ViewPlugin.fromClass(
  class Plugin {
    decorations: DecorationSet
    constructor() {
      this.decorations = Decoration.none
    }

    update(update: ViewUpdate) {
      const completion = selectedCompletion(update.state)
      if (!completion || completion.type !== 'copilot') {
        this.decorations = Decoration.none
        return
      }

      const pos = update.view.state.selection.main.head
      const widgets = [
        Decoration.widget({
          widget: new InlineSuggestionWidget(completion.label),
          side: 1,
        }).range(pos),
      ]

      this.decorations = Decoration.set(widgets)
    }
  },
  {
    decorations: (v) => v.decorations,
  },
)
