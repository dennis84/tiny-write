import * as prettier from 'prettier'
import * as estreePlugin from 'prettier/plugins/estree'
import babelPlugin from 'prettier/plugins/babel'
import typescriptPlugin from 'prettier/plugins/typescript'
import cssPlugin from 'prettier/plugins/postcss'
import htmlPlugin from 'prettier/plugins/html'
import markdownPlugin from 'prettier/plugins/markdown'
import yamlPlugin from 'prettier/plugins/yaml'
import {PrettierConfig} from '@/state'

type PrettierLang = [string, prettier.Plugin[]]

export class PrettierService {
  private js: PrettierLang = ['babel', [babelPlugin, estreePlugin]]
  private ts: PrettierLang = ['typescript', [typescriptPlugin, estreePlugin]]
  private json: PrettierLang = ['json', [babelPlugin, estreePlugin]]
  private css: PrettierLang = ['css', [cssPlugin]]
  private markdown: PrettierLang = ['markdown', [markdownPlugin]]
  private html: PrettierLang = ['html', [htmlPlugin]]
  private yaml: PrettierLang = ['yaml', [yamlPlugin]]

  private mapping = new Map<string, PrettierLang>([
    ['javascript', this.js],
    ['js', this.js],
    ['jsx', this.js],
    ['typescript', this.ts],
    ['ts', this.ts],
    ['tsx', this.ts],
    ['json', this.json],
    ['css', this.css],
    ['less', this.css],
    ['scss', this.css],
    ['markdown', this.markdown],
    ['html', this.html],
    ['yaml', this.yaml],
  ])

  async check(code: string, lang: string, options: PrettierConfig): Promise<boolean> {
    try {
      let formatted = await this.format(code, lang, options)
      formatted = formatted.trim()
      return formatted !== code
    } catch (_e) {
      return false
    }
  }

  async format(code: string, lang: string, options: PrettierConfig): Promise<string> {
    const prettierLang = this.mapping.get(lang)
    if (!prettierLang) throw new Error(`No parser and plugins for ${lang}`)
    const [parser, plugins] = prettierLang

    const formatted = await prettier.format(code, {
      parser,
      plugins,
      trailingComma: 'all',
      ...options,
    })

    return formatted
  }

  supports(lang: string): boolean {
    return this.mapping.has(lang)
  }
}
