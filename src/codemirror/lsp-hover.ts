import {EditorView, HoverTooltipSource} from '@codemirror/view'
import {lspHover} from '@/remote'
import markdownit from 'markdown-it'

const md = markdownit({html: true})

export const lspHoverSource =
  (path: string): HoverTooltipSource =>
  async (view: EditorView, pos: number) => {
    const word = view.state.wordAt(pos) ?? {from: pos, to: pos}
    const line = view.state.doc.lineAt(word.from)
    const row = line.number - 1
    const column = word.from - line.from

    const response = await lspHover(path, row, column)
    const text = (response as any)?.contents?.value?.trim()
    if (!text) return null

    const parsed = md.render(text, {})

    const dom = document.createElement('div')
    dom.innerHTML = parsed

    return {
      pos: word.from,
      end: word.to,
      create: () => ({dom}),
    }
  }
