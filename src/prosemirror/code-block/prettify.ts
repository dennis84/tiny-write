import {ViewPlugin, ViewUpdate} from '@codemirror/view'
import {setDiagnostics} from '@codemirror/lint'
import {CodeBlockView} from './view'

export const createPrettifyPlugin = (codeBlock: CodeBlockView) =>
  ViewPlugin.fromClass(class {
    update(update: ViewUpdate) {
      if (update.transactions[0]?.isUserEvent('prettify')) {
        update.view.focus()
        void this.prettify(update)
        return true
      }
    }

    private async prettify(update: ViewUpdate) {
      const view = update.view
      try {
        const doc = view.state.doc.toString()
        const value = await codeBlock.ctrl.prettier.format(doc, codeBlock.lang, codeBlock.ctrl.config.prettier)
        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: value.substring(0, value.lastIndexOf('\n')),
          }
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
  })
