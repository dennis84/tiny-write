import {EditorView, HoverTooltipSource} from '@codemirror/view'
import {lspHover} from '@/remote'

export const lspHoverSource =
  (path: string): HoverTooltipSource =>
  async (view: EditorView, pos: number) => {
    const sel = view.state.selection.main
    const line = view.state.doc.lineAt(sel.head)
    const row = line.number - 1
    const column = sel.head - line.from

    const response = await lspHover(path, row, column)
    const text = (response as any)?.contents?.value
    if (!text) return null

    const dom = document.createElement('pre')
    dom.classList.add('cm-tooltip-lsp-hover')
    dom.textContent = text

    return {
      pos,
      create: () => ({dom}),
    }
  }
