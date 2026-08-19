import {cpp} from '@codemirror/lang-cpp'
import {css} from '@codemirror/lang-css'
import {html} from '@codemirror/lang-html'
import {java} from '@codemirror/lang-java'
import {javascript} from '@codemirror/lang-javascript'
import {json} from '@codemirror/lang-json'
import {markdown} from '@codemirror/lang-markdown'
import {php} from '@codemirror/lang-php'
import {python} from '@codemirror/lang-python'
import {rust} from '@codemirror/lang-rust'
import {sql} from '@codemirror/lang-sql'
import {xml} from '@codemirror/lang-xml'
import {
  LanguageSupport,
  StreamLanguage,
  type StreamParser,
  type StringStream,
} from '@codemirror/language'
import {clojure} from '@codemirror/legacy-modes/mode/clojure'
import {erlang} from '@codemirror/legacy-modes/mode/erlang'
import {go} from '@codemirror/legacy-modes/mode/go'
import {groovy} from '@codemirror/legacy-modes/mode/groovy'
import {haskell} from '@codemirror/legacy-modes/mode/haskell'
import {lua} from '@codemirror/legacy-modes/mode/lua'
import {ruby} from '@codemirror/legacy-modes/mode/ruby'
import {shell} from '@codemirror/legacy-modes/mode/shell'
import {toml} from '@codemirror/legacy-modes/mode/toml'
import {yaml} from '@codemirror/legacy-modes/mode/yaml'

const langSupport = (l: StreamParser<unknown>) => new LanguageSupport(StreamLanguage.define(l))

export interface LangConfig {
  id: string
  name: string
  extension: string
  highlight: () => LanguageSupport
  aliases?: string[]
  indentUnit?: string
}

const languages: Record<string, LangConfig> = {
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    extension: 'js',
    highlight: () => javascript(),
    aliases: ['js'],
  },
  jsx: {
    id: 'jsx',
    name: 'JSX',
    extension: 'jsx',
    highlight: () => javascript({jsx: true}),
  },
  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    extension: 'ts',
    highlight: () => javascript({typescript: true}),
    aliases: ['ts'],
  },
  tsx: {
    id: 'tsx',
    name: 'TSX',
    extension: 'tsx',
    highlight: () => javascript({jsx: true, typescript: true}),
  },
  java: {
    id: 'java',
    name: 'Java',
    extension: 'java',
    highlight: () => java(),
    indentUnit: '    ',
  },
  kotlin: {
    id: 'kotlin',
    name: 'Kotlin',
    extension: 'kt',
    highlight: () => java(),
    aliases: ['kt'],
    indentUnit: '    ',
  },
  rust: {
    id: 'rust',
    name: 'Rust',
    extension: 'rs',
    highlight: () => rust(),
    aliases: ['rs'],
    indentUnit: '    ',
  },
  sql: {
    id: 'sql',
    name: 'SQL',
    extension: 'sql',
    highlight: () => sql(),
  },
  json: {
    id: 'json',
    name: 'JSON',
    extension: 'json',
    highlight: () => json(),
  },
  python: {
    id: 'python',
    name: 'Python',
    extension: 'py',
    highlight: () => python(),
    aliases: ['py'],
    indentUnit: '    ',
  },
  html: {
    id: 'html',
    name: 'HTML',
    extension: 'html',
    highlight: () => html(),
    aliases: ['htm'],
  },
  css: {
    id: 'css',
    name: 'CSS',
    extension: 'css',
    highlight: () => css(),
  },
  scss: {
    id: 'scss',
    name: 'SCSS',
    extension: 'scss',
    highlight: () => css(),
  },
  cpp: {
    id: 'cpp',
    name: 'C++',
    extension: 'cpp',
    highlight: () => cpp(),
  },
  markdown: {
    id: 'markdown',
    name: 'Markdown',
    extension: 'md',
    highlight: () => markdown(),
    aliases: ['md'],
  },
  xml: {
    id: 'xml',
    name: 'XML',
    extension: 'xml',
    highlight: () => xml(),
  },
  php: {
    id: 'php',
    name: 'PHP',
    extension: 'php',
    highlight: () => php(),
  },
  haskell: {
    id: 'haskell',
    name: 'Haskell',
    extension: 'hs',
    highlight: () => langSupport(haskell),
    aliases: ['hs'],
  },
  clojure: {
    id: 'clojure',
    name: 'Clojure',
    extension: 'clj',
    highlight: () => langSupport(clojure),
    aliases: ['clj'],
  },
  erlang: {
    id: 'erlang',
    name: 'Erlang',
    extension: 'erl',
    highlight: () => langSupport(erlang),
  },
  groovy: {
    id: 'groovy',
    name: 'Groovy',
    extension: 'groovy',
    highlight: () => langSupport(groovy),
  },
  ruby: {
    id: 'ruby',
    name: 'Ruby',
    extension: 'rb',
    highlight: () => langSupport(ruby),
    aliases: ['rb'],
  },
  hcl: {
    id: 'hcl',
    name: 'HCL',
    extension: 'hcl',
    highlight: () => langSupport(ruby),
  },
  mermaid: {
    id: 'mermaid',
    name: 'Mermaid',
    extension: 'mermaid',
    highlight: () => langSupport(haskell),
  },
  bash: {
    id: 'bash',
    name: 'Bash',
    extension: 'bash',
    highlight: () => langSupport(shell),
  },
  sh: {
    id: 'sh',
    name: 'Shell',
    extension: 'sh',
    highlight: () => langSupport(shell),
  },
  yaml: {
    id: 'yaml',
    name: 'YAML',
    extension: 'yaml',
    highlight: () => langSupport(yaml),
    aliases: ['yml'],
  },
  go: {
    id: 'go',
    name: 'GO',
    extension: 'go',
    highlight: () => langSupport(go),
    indentUnit: '\t',
  },
  toml: {
    id: 'toml',
    name: 'TOML',
    extension: 'toml',
    highlight: () => langSupport(toml),
    indentUnit: '    ',
  },
  lua: {
    id: 'lua',
    name: 'Lua',
    extension: 'lua',
    highlight: () => langSupport(lua),
    indentUnit: '\t',
  },
}

export const getLanguageConfig = (lang: string = ''): LangConfig => {
  const codeLang = findCodeLang(lang)
  const fallback: LangConfig = {
    id: 'plaintext',
    name: 'Plaintext',
    extension: 'txt',
    highlight: () =>
      langSupport({
        name: lang,
        token: (stream: StringStream) => {
          stream.next()
          return null
        },
      }),
  }

  return languages[codeLang ?? ''] ?? fallback
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
