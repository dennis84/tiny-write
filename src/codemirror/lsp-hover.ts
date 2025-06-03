import type {EditorView, HoverTooltipSource} from '@codemirror/view'
import {lspHover} from '@/remote/lsp'
import markdownit from 'markdown-it'

const md = markdownit({html: true})

export const lspHoverSource =
  (path: string): HoverTooltipSource =>
  async (view: EditorView, pos: number) => {
    const word = view.state.wordAt(pos) ?? {from: pos, to: pos}

    const response = await lspHover(path, pos)
    const text = response.contents?.value?.trim()
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
