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

const langSupport = (l: StreamParser<unknown>) =>
  new LanguageSupport(StreamLanguage.define(l))

export const languages: Record<string, () => LanguageSupport> = {
  javascript: () => javascript(),
  js: () => javascript(),
  jsx: () => javascript({jsx: true}),
  typescript: () => javascript({typescript: true}),
  ts: () => javascript({typescript: true}),
  tsx: () => javascript({jsx: true, typescript: true}),
  java: () => java(),
  kotlin: () => java(),
  rust: () => rust(),
  sql: () => sql(),
  json: () => json(),
  python: () => python(),
  html: () => html(),
  css: () => css(),
  cpp: () => cpp(),
  markdown: () => markdown(),
  xml: () => xml(),
  haskell: () => langSupport(haskell),
  clojure: () => langSupport(clojure),
  erlang: () => langSupport(erlang),
  groovy: () => langSupport(groovy),
  ruby: () => langSupport(ruby),
  hcl: () => langSupport(ruby),
  mermaid: () => langSupport(haskell),
  bash: () => langSupport(shell),
  yaml: () => langSupport(yaml),
  go: () => langSupport(go),
  toml: () => langSupport(toml),
}

export const highlight = (lang: string) => languages[lang]?.() ?? markdown()
