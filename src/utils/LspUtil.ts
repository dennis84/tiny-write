import type {EditorView} from '@codemirror/view'
import type * as lspTypes from 'vscode-languageserver-protocol'
import type {SelectionRange} from '@/types'

export class LspUtil {
  private static readonly PREFIX = 'file:///__virtual__/'

  static createBufferUri(id: string, extension: string | undefined = undefined) {
    // LSP servers insists of "file://" scheme
    return `${LspUtil.PREFIX}${id}${extension ? `.${extension}` : ''}`
  }

  static isBufferUri(uri: string) {
    return uri.startsWith(LspUtil.PREFIX)
  }

  static uriToPath(uri: string): string {
    return uri.substring(7) // rm file://
  }

  static parseBufferUri(uri: string): [string, string | undefined] {
    const parts = uri.substring(LspUtil.PREFIX.length).split('.')
    return [parts[0], parts[1]]
  }

  static createSelection(view: EditorView, range: lspTypes.Range): SelectionRange {
    const anchor = view.state.doc.line(range.start.line + 1).from + range.start.character
    let head: number | undefined
    if (range.end) {
      head = view.state.doc.line(range.end.line + 1).from + range.end.character
    }

    return {
      anchor,
      head,
    }
  }
}
