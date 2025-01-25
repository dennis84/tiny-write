import {JSXElement, Match, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import OcticonCopilot24 from '~icons/octicon/copilot-24?width=24px&height=24px'
import MingcuteAiLine from '~icons/mingcute/ai-line?width=24px&height=24px'
import OcticonCopilotError16 from '~icons/octicon/copilot-error-16?width=16px&height=16px'
import SimpleIconsTypescript from '~icons/simple-icons/typescript?width=24px&height=24px'
import SimpleIconsJavascript from '~icons/simple-icons/javascript?width=24px&height=24px'
import SimpleIconsJson from '~icons/simple-icons/json?width=24px&height=24px'
import SimpleIconsPython from '~icons/simple-icons/python?width=24px&height=24px'
import SimpleIconsRust from '~icons/simple-icons/rust?width=24px&height=24px'
import SimpleIconsReact from '~icons/simple-icons/react?width=24px&height=24px'
import {findCodeLang} from '@/codemirror/highlight'

export const Icon = (props: {children: JSXElement}) => <span class="icon">{props.children}</span>

const SvgIcon = styled('span')`
  display: flex;
  align-items: center;
  justify-content: center;
  svg {
    height: 16px;
    width: 16px;
  }
`

export const IconRowRemove = () => (
  <SvgIcon class="icon">
    <svg viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M9.41 13L12 15.59L14.59 13L16 14.41L13.41 17L16 19.59L14.59 21L12 18.41L9.41 21L8 19.59L10.59 17L8 14.41zM22 9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2zM4 9h4V6H4zm6 0h4V6h-4zm6 0h4V6h-4z"
      ></path>
    </svg>
  </SvgIcon>
)

export const IconColumnRemove = () => (
  <SvgIcon class="icon">
    <svg viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M4 2h7a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m0 8v4h7v-4zm0 6v4h7v-4zM4 4v4h7V4zm13.59 8L15 9.41L16.41 8L19 10.59L21.59 8L23 9.41L20.41 12L23 14.59L21.59 16L19 13.41L16.41 16L15 14.59z"
      ></path>
    </svg>
  </SvgIcon>
)

export const IconFloatCenter = () => (
  <SvgIcon class="icon">
    <svg viewBox="0 0 1024 1024">
      <path
        fill="currentColor"
        d="M952 792H72c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h880c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8m0-632H72c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h880c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8M848 660c8.8 0 16-7.2 16-16V380c0-8.8-7.2-16-16-16H176c-8.8 0-16 7.2-16 16v264c0 8.8 7.2 16 16 16zM232 436h560v152H232z"
      ></path>
    </svg>
  </SvgIcon>
)

export const IconPrettier = () => (
  <SvgIcon class="icon">
    <svg viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M8.571 23.429A.57.57 0 0 1 8 24H2.286a.571.571 0 0 1 0-1.143H8c.316 0 .571.256.571.572M8 20.57H6.857a.571.571 0 0 0 0 1.143H8a.571.571 0 0 0 0-1.143m-5.714 1.143H4.57a.571.571 0 0 0 0-1.143H2.286a.571.571 0 0 0 0 1.143M8 18.286H2.286a.571.571 0 0 0 0 1.143H8a.571.571 0 0 0 0-1.143M16 16H5.714a.571.571 0 0 0 0 1.143H16A.571.571 0 0 0 16 16M2.286 17.143h1.143a.571.571 0 0 0 0-1.143H2.286a.571.571 0 0 0 0 1.143m17.143-3.429H16a.571.571 0 0 0 0 1.143h3.429a.571.571 0 0 0 0-1.143M9.143 14.857h4.571a.571.571 0 0 0 0-1.143H9.143a.571.571 0 0 0 0 1.143m-6.857 0h4.571a.571.571 0 0 0 0-1.143H2.286a.571.571 0 0 0 0 1.143M20.57 11.43h-9.14a.571.571 0 0 0 0 1.142h9.142a.571.571 0 0 0 0-1.142zM9.714 12a.57.57 0 0 0-.571-.571H5.714a.571.571 0 0 0 0 1.142h3.429A.57.57 0 0 0 9.714 12m-7.428.571h1.143a.571.571 0 0 0 0-1.142H2.286a.571.571 0 0 0 0 1.142m19.428-3.428H16a.571.571 0 0 0 0 1.143h5.714a.571.571 0 0 0 0-1.143M2.286 10.286H8a.571.571 0 0 0 0-1.143H2.286a.571.571 0 0 0 0 1.143m13.143-2.857A.57.57 0 0 0 16 8h5.714a.571.571 0 0 0 0-1.143H16a.57.57 0 0 0-.571.572m-8.572-.572a.571.571 0 0 0 0 1.143H8a.571.571 0 0 0 0-1.143zM2.286 8H4.57a.571.571 0 0 0 0-1.143H2.286a.571.571 0 0 0 0 1.143m16.571-2.857c0 .315.256.571.572.571h1.142a.571.571 0 0 0 0-1.143H19.43a.57.57 0 0 0-.572.572zm-1.143 0a.57.57 0 0 0-.571-.572H12.57a.571.571 0 0 0 0 1.143h4.572a.57.57 0 0 0 .571-.571zm-15.428.571h8a.571.571 0 0 0 0-1.143h-8a.571.571 0 0 0 0 1.143m5.143-2.857c0 .316.255.572.571.572h11.429a.571.571 0 0 0 0-1.143H8a.57.57 0 0 0-.571.571m-5.143.572h3.428a.571.571 0 0 0 0-1.143H2.286a.571.571 0 0 0 0 1.143m0-2.286H16A.571.571 0 0 0 16 0H2.286a.571.571 0 0 0 0 1.143"
      ></path>
    </svg>
  </SvgIcon>
)

export const IconAi = () => (
  <SvgIcon class="icon">
    <MingcuteAiLine />
  </SvgIcon>
)

export const IconAiAssistant = () => (
  <SvgIcon class="icon">
    <OcticonCopilot24 />
  </SvgIcon>
)

export const IconCopilot = () => (
  <SvgIcon class="icon">
    <OcticonCopilot24 />
  </SvgIcon>
)

export const IconAiAssistantClose = () => (
  <SvgIcon class="icon">
    <OcticonCopilotError16 />
  </SvgIcon>
)

export const CodeIcon = (props: {lang?: string}) => {
  const lang = findCodeLang(props.lang ?? '')
  return (
    <Switch fallback={<Icon>code_blocks</Icon>}>
      <Match when={lang === 'typescript'}>
        <SvgIcon class="icon">
          <SimpleIconsTypescript />
        </SvgIcon>
      </Match>
      <Match when={lang === 'javascript'}>
        <SvgIcon class="icon">
          <SimpleIconsJavascript />
        </SvgIcon>
      </Match>
      <Match when={lang === 'jsx' || lang === 'tsx'}>
        <SvgIcon class="icon">
          <SimpleIconsReact />
        </SvgIcon>
      </Match>
      <Match when={lang === 'json'}>
        <SvgIcon class="icon">
          <SimpleIconsJson />
        </SvgIcon>
      </Match>
      <Match when={lang === 'python'}>
        <SvgIcon class="icon">
          <SimpleIconsPython />
        </SvgIcon>
      </Match>
      <Match when={lang === 'rust'}>
        <SvgIcon class="icon">
          <SimpleIconsRust />
        </SvgIcon>
      </Match>
    </Switch>
  )
}
