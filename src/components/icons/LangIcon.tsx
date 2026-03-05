import {Dynamic} from 'solid-js/web'
import {findCodeLang} from '@/codemirror/highlight'
import LucideSquareCode from '~icons/lucide/square-code'
import sh from '~icons/mdi/dollar'
import java from '~icons/mdi/language-java'
import groovy from '~icons/simple-icons/apachegroovy'
import clojure from '~icons/simple-icons/clojure'
import cpp from '~icons/simple-icons/cplusplus'
import css from '~icons/simple-icons/css'
import erlang from '~icons/simple-icons/erlang'
import go from '~icons/simple-icons/go'
import haskell from '~icons/simple-icons/haskell'
import hcl from '~icons/simple-icons/hcl'
import html from '~icons/simple-icons/html5'
import javascript from '~icons/simple-icons/javascript'
import json from '~icons/simple-icons/json'
import kotlin from '~icons/simple-icons/kotlin'
import lua from '~icons/simple-icons/lua'
import markdown from '~icons/simple-icons/markdown'
import mermaid from '~icons/simple-icons/mermaid'
import php from '~icons/simple-icons/php'
import python from '~icons/simple-icons/python'
import react from '~icons/simple-icons/react'
import ruby from '~icons/simple-icons/ruby'
import rust from '~icons/simple-icons/rust'
import toml from '~icons/simple-icons/toml'
import typescript from '~icons/simple-icons/typescript'
import xml from '~icons/simple-icons/xml'
import yaml from '~icons/simple-icons/yaml'
import {SvgIcon} from './Style'

const langIcons: Record<string, any> = {
  javascript,
  typescript,
  tsx: react,
  jsx: react,
  python,
  rust,
  html,
  css,
  java,
  kotlin,
  json,
  cpp,
  markdown,
  xml,
  php,
  haskell,
  clojure,
  erlang,
  groovy,
  ruby,
  hcl,
  mermaid,
  sh,
  yaml,
  go,
  toml,
  lua,
}

export const LangIcon = (props: {name?: string}) => {
  const lang = findCodeLang(props.name ?? '')
  const Icon = langIcons[lang ?? ''] ?? (() => <LucideSquareCode />)
  return (
    <SvgIcon>
      <Dynamic component={Icon} />
    </SvgIcon>
  )
}
