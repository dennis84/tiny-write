import {StreamLanguage, LanguageSupport, type StreamParser, type StringStream} from '@codemirror/language'
import {haskell} from '@codemirror/legacy-modes/mode/haskell'
import {clojure} from '@codemirror/legacy-modes/mode/clojure'
import {erlang} from '@codemirror/legacy-modes/mode/erlang'
import {groovy} from '@codemirror/legacy-modes/mode/groovy'
import {ruby} from '@codemirror/legacy-modes/mode/ruby'
import {shell} from '@codemirror/legacy-modes/mode/shell'
import {yaml} from '@codemirror/legacy-modes/mode/yaml'
import {go} from '@codemirror/legacy-modes/mode/go'
import {toml} from '@codemirror/legacy-modes/mode/toml'
import {lua} from '@codemirror/legacy-modes/mode/lua'
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
import {php} from '@codemirror/lang-php'

const langSupport = (l: StreamParser<unknown>) => new LanguageSupport(StreamLanguage.define(l))

export interface LangConfig {
  id: string
  name: string
  highlight: () => LanguageSupport
  aliases?: string[]
  indentUnit?: string
}

const languages: Record<string, LangConfig> = {
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    highlight: () => javascript(),
    aliases: ['js'],
  },
  jsx: {
    id: 'jsx',
    name: 'JSX',
    highlight: () => javascript({jsx: true}),
  },
  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    highlight: () => javascript({typescript: true}),
    aliases: ['ts'],
  },
  tsx: {
    id: 'tsx',
    name: 'TSX',
    highlight: () => javascript({jsx: true, typescript: true}),
  },
  java: {
    id: 'java',
    name: 'Java',
    highlight: () => java(),
    indentUnit: '    ',
  },
  kotlin: {
    id: 'kotlin',
    name: 'Kotlin',
    highlight: () => java(),
    aliases: ['kt'],
    indentUnit: '    ',
  },
  rust: {
    id: 'rust',
    name: 'Rust',
    highlight: () => rust(),
    aliases: ['rs'],
    indentUnit: '    ',
  },
  sql: {
    id: 'sql',
    name: 'SQL',
    highlight: () => sql(),
  },
  json: {
    id: 'json',
    name: 'JSON',
    highlight: () => json(),
  },
  python: {
    id: 'python',
    name: 'Python',
    highlight: () => python(),
    aliases: ['py'],
    indentUnit: '    ',
  },
  html: {
    id: 'html',
    name: 'HTML',
    highlight: () => html(),
    aliases: ['htm'],
  },
  css: {
    id: 'css',
    name: 'CSS',
    highlight: () => css(),
  },
  scss: {
    id: 'scss',
    name: 'SCSS',
    highlight: () => css(),
  },
  cpp: {
    id: 'cpp',
    name: 'C++',
    highlight: () => cpp(),
  },
  markdown: {
    id: 'markdown',
    name: 'Markdown',
    highlight: () => markdown(),
    aliases: ['md'],
  },
  xml: {
    id: 'xml',
    name: 'XML',
    highlight: () => xml(),
  },
  php: {
    id: 'php',
    name: 'PHP',
    highlight: () => php(),
  },
  haskell: {
    id: 'haskell',
    name: 'Haskell',
    highlight: () => langSupport(haskell),
    aliases: ['hs'],
  },
  clojure: {
    id: 'clojure',
    name: 'Clojure',
    highlight: () => langSupport(clojure),
    aliases: ['clj'],
  },
  erlang: {
    id: 'erlang',
    name: 'Erlang',
    highlight: () => langSupport(erlang),
  },
  groovy: {
    id: 'groovy',
    name: 'Groovy',
    highlight: () => langSupport(groovy),
  },
  ruby: {
    id: 'ruby',
    name: 'Ruby',
    highlight: () => langSupport(ruby),
    aliases: ['rb'],
  },
  hcl: {
    id: 'hcl',
    name: 'HCL',
    highlight: () => langSupport(ruby),
  },
  mermaid: {
    id: 'mermaid',
    name: 'Mermaid',
    highlight: () => langSupport(haskell),
  },
  bash: {
    id: 'bash',
    name: 'Bash',
    highlight: () => langSupport(shell),
  },
  sh: {
    id: 'sh',
    name: 'Shell',
    highlight: () => langSupport(shell),
  },
  yaml: {
    id: 'yaml',
    name: 'YAML',
    highlight: () => langSupport(yaml),
    aliases: ['yml'],
  },
  go: {
    id: 'go',
    name: 'GO',
    highlight: () => langSupport(go),
    indentUnit: '\t',
  },
  toml: {
    id: 'toml',
    name: 'TOML',
    highlight: () => langSupport(toml),
    indentUnit: '    ',
  },
  lua: {
    id: 'lua',
    name: 'Lua',
    highlight: () => langSupport(lua),
    indentUnit: '\t',
  },
}

export const getLanguageConfig = (lang: string = ''): LangConfig => {
  const codeLang = findCodeLang(lang)
  return (
    languages[codeLang ?? ''] ?? {
      highlight: () =>
        langSupport({
          name: lang,
          token: (stream: StringStream) => {
            stream.next()
            return null
          },
        }),
    }
  )
}

export const findCodeLang = (lang: string): string | undefined => {
  for (const [name, config] of Object.entries(languages)) {
    if (lang === name || config.aliases?.includes(lang)) return name
  }
}

export const getLanguageNames = () => {
  const names = []
  for (const [name, config] of Object.entries(languages)) {
    names.push(name, ...(config.aliases ?? []))
  }

  return names
}
