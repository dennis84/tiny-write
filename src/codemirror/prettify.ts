import {EditorView} from '@codemirror/view'
import {setDiagnostics} from '@codemirror/lint'
import {PrettierService} from '@/services/PrettierService'
import {PrettierConfig} from '@/state'

const prettier = new PrettierService()

export const format = async (view: EditorView, lang: string, config: PrettierConfig) => {
  try {
    const doc = view.state.doc.toString()
    const value = await prettier.format(doc, lang, config)
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value.substring(0, value.lastIndexOf('\n')),
      },
    })
  } catch (err: any) {
    if (!err.loc?.start?.line) return
    const line = view.state.doc.line(err.loc.start.line)
    const lines = err.message.split('\n')
    const diagnostics = lines.map((message: string) => ({
      from: line.from + err.loc.start.column - 1,
      to: line.from + err.loc.start.column - 1,
      severity: 'error',
      message: message,
    }))

    view.dispatch(setDiagnostics(view.state, diagnostics))
  }
}
