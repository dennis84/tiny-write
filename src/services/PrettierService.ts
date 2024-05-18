import * as prettier from 'prettier'
import * as estreePlugin from 'prettier/plugins/estree'
import babelPlugin from 'prettier/plugins/babel'
import typescriptPlugin from 'prettier/plugins/typescript'
import cssPlugin from 'prettier/plugins/postcss'
import htmlPlugin from 'prettier/plugins/html'
import markdownPlugin from 'prettier/plugins/markdown'
import yamlPlugin from 'prettier/plugins/yaml'
import {PrettierConfig} from '@/state'

export class PrettierService {

  async format(code: string, lang: string, options: PrettierConfig): Promise<string> {
    const [parser, plugins] = this.getParserAndPlugins(lang)
    if (!parser) return code
    return await prettier.format(code, {
      parser,
      plugins,
      trailingComma: 'all',
      bracketSpacing: false,
      ...options,
    })
  }

  private getParserAndPlugins(lang: string): [string, prettier.Plugin[]] {
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
}
