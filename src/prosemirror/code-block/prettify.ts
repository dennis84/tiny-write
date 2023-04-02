import {EditorView, ViewPlugin, ViewUpdate} from '@codemirror/view'
import {setDiagnostics} from '@codemirror/lint'
import prettier from 'prettier'
import parserBabel from 'prettier/parser-babel'
import parserTypescript from 'prettier/parser-typescript'
import parserCss from 'prettier/parser-postcss'
import parserHtml from 'prettier/parser-html'
import parserMarkdown from 'prettier/parser-markdown'
import parserYaml from 'prettier/parser-yaml'
import {PrettierConfig} from '@/state'
import {CodeBlockView} from './view'

export const prettifyView = (codeBlock: CodeBlockView) =>
  ViewPlugin.fromClass(class {
    update(update: ViewUpdate) {
      if (update.transactions[0]?.isUserEvent('prettify')) {
        update.view.focus()
        setTimeout(() => {
          prettify(update.view, codeBlock.lang, codeBlock.options.state.config.prettier)
        })

        return true
      }
    }
  })

const prettify = (view: EditorView, lang: string, options: PrettierConfig) => {
  const [parser, plugin] =
    lang === 'javascript' || lang === 'js' || lang === 'jsx' ? ['babel', parserBabel] :
    lang === 'css' ? ['css', parserCss] :
    lang === 'markdown' ? ['markdown', parserMarkdown] :
    lang === 'html' ? ['html', parserHtml] :
    lang === 'less' ? ['less', parserCss] :
    lang === 'scss' ? ['scss', parserCss] :
    lang === 'yaml' ? ['yaml', parserYaml] :
    lang === 'json' ? ['json', parserBabel] :
    lang === 'typescript' || lang === 'ts' || lang === 'tsx' ? ['typescript', parserTypescript] :
    [undefined, undefined]
  if (!parser) return
  try {
    const value = prettier.format(view.state.doc.toString(), {
      parser,
      plugins: [plugin],
      trailingComma: 'all',
      bracketSpacing: false,
      ...options,
    })

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
