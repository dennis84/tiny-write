import {EditorView, ViewPlugin, ViewUpdate} from '@codemirror/view'
import {setDiagnostics} from '@codemirror/lint'
import * as prettier from 'prettier'
import * as estreePlugin from 'prettier/plugins/estree'
import babelPlugin from 'prettier/plugins/babel'
import typescriptPlugin from 'prettier/plugins/typescript'
import cssPlugin from 'prettier/plugins/postcss'
import htmlPlugin from 'prettier/plugins/html'
import markdownPlugin from 'prettier/plugins/markdown'
import yamlPlugin from 'prettier/plugins/yaml'
import {PrettierConfig} from '@/state'
import {CodeBlockView} from './view'

export const prettifyView = (codeBlock: CodeBlockView) =>
  ViewPlugin.fromClass(class {
    update(update: ViewUpdate) {
      if (update.transactions[0]?.isUserEvent('prettify')) {
        update.view.focus()
        prettify(update.view, codeBlock.lang, codeBlock.ctrl.config.prettier)
        return true
      }
    }
  })

const prettify = async (view: EditorView, lang: string, options: PrettierConfig) => {
  const [parser, plugins] = getParserAndPlugins(lang)
  if (!parser) return
  try {
    const value = await prettier.format(view.state.doc.toString(), {
      parser,
      plugins,
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

const getParserAndPlugins = (lang: string): [string, prettier.Plugin[]] => {
  switch (lang) {
  case 'javascript':
  case 'js':
  case 'jsx':
    return ['babel', [babelPlugin, estreePlugin]]
  case 'typescript':
  case 'ts':
  case 'tsx':
    return ['typescript', [typescriptPlugin, estreePlugin]]
  case 'json':
    return ['json', [babelPlugin, estreePlugin]]
  case 'css':
    return ['css', [cssPlugin]]
  case 'markdown':
    return ['markdown', [markdownPlugin]]
  case 'html':
    return ['html', [htmlPlugin]]
  case 'less':
    return ['less', [cssPlugin]]
  case 'scss':
    return ['scss', [cssPlugin]]
  case 'yaml':
    return ['yaml', [yamlPlugin]]
  }

  throw new Error(`No parser and plugins for ${lang}`)
}
