import {StreamLanguage, LanguageSupport, StreamParser} from '@codemirror/language'
import {haskell} from '@codemirror/legacy-modes/mode/haskell'
import {clojure} from '@codemirror/legacy-modes/mode/clojure'
import {erlang} from '@codemirror/legacy-modes/mode/erlang'
import {groovy} from '@codemirror/legacy-modes/mode/groovy'
import {ruby} from '@codemirror/legacy-modes/mode/ruby'
import {shell} from '@codemirror/legacy-modes/mode/shell'
import {yaml} from '@codemirror/legacy-modes/mode/yaml'
import {go} from '@codemirror/legacy-modes/mode/go'
import {toml} from '@codemirror/legacy-modes/mode/toml'
import {javascript} from '@codemirror/lang-javascript'
import {java} from '@codemirror/lang-java'
import {rust} from '@codemirror/lang-rust'
import {sql} from '@codemirror/lang-sql'
import {json} from '@codemirror/lang-json'
import {python} from '@codemirror/lang-python'
import {html} from '@codemirror/lang-html'
import {css} from '@codemirror/lang-css'
import {cpp} from '@codemirror/lang-cpp'
import {markdown} from '@codemirror/lang-markdown'
import {xml} from '@codemirror/lang-xml'

const langSupport = (l: StreamParser<unknown>) => new LanguageSupport(StreamLanguage.define(l))

interface LangConfig {
  highlight: () => LanguageSupport
  aliases?: string[]
}

export const languages: Record<string, LangConfig> = {
  javascript: {
    highlight: () => javascript(),
    aliases: ['js'],
  },
  jsx: {
    highlight: () => javascript({jsx: true}),
  },
  typescript: {
    highlight: () => javascript({typescript: true}),
    aliases: ['ts'],
  },
  tsx: {
    highlight: () => javascript({jsx: true, typescript: true}),
  },
  java: {
    highlight: () => java(),
  },
  kotlin: {
    highlight: () => java(),
    aliases: ['kt'],
  },
  rust: {
    highlight: () => rust(),
    aliases: ['rs'],
  },
  sql: {
    highlight: () => sql(),
  },
  json: {
    highlight: () => json(),
  },
  python: {
    highlight: () => python(),
    aliases: ['py'],
  },
  html: {
    highlight: () => html(),
    aliases: ['htm'],
  },
  css: {
    highlight: () => css(),
  },
  scss: {
    highlight: () => css(),
  },
  cpp: {
    highlight: () => cpp(),
  },
  markdown: {
    highlight: () => markdown(),
    aliases: ['md'],
  },
  xml: {
    highlight: () => xml(),
  },
  haskell: {
    highlight: () => langSupport(haskell),
    aliases: ['hs'],
  },
  clojure: {
    highlight: () => langSupport(clojure),
    aliases: ['clj'],
  },
  erlang: {
    highlight: () => langSupport(erlang),
  },
  groovy: {
    highlight: () => langSupport(groovy),
  },
  ruby: {
    highlight: () => langSupport(ruby),
    aliases: ['rb'],
  },
  hcl: {
    highlight: () => langSupport(ruby),
  },
  mermaid: {
    highlight: () => langSupport(haskell),
  },
  bash: {
    highlight: () => langSupport(shell),
  },
  sh: {
    highlight: () => langSupport(shell),
  },
  yaml: {
    highlight: () => langSupport(yaml),
    aliases: ['yml'],
  },
  go: {
    highlight: () => langSupport(go),
  },
  toml: {
    highlight: () => langSupport(toml),
  },
}

export const highlight = (lang: string): LanguageSupport | undefined => {
  const codeLang = findCodeLang(lang)
  if (!codeLang) return
  return languages[codeLang]?.highlight()
}

export const findCodeLang = (lang: string): string | undefined => {
  for (const [name, config] of Object.entries(languages)) {
    if (lang === name || config.aliases?.includes(lang)) return name
  }
}
