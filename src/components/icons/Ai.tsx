import LucideGhost from '~icons/lucide/ghost'
import MingcuteAiLine from '~icons/mingcute/ai-line'
import OcticonCopilot16 from '~icons/octicon/copilot-16'
import OcticonCopilotError16 from '~icons/octicon/copilot-error-16'
import {SvgIcon} from './Style'

export const IconAi = () => (
  <SvgIcon>
    <MingcuteAiLine />
  </SvgIcon>
)

export const IconAiAssistant = () => (
  <SvgIcon>
    <OcticonCopilot16 />
  </SvgIcon>
)

export const IconAiAssistantClose = () => (
  <SvgIcon>
    <OcticonCopilotError16 />
  </SvgIcon>
)

export const IconPrivate = () => (
  <SvgIcon>
    <LucideGhost />
  </SvgIcon>
)
