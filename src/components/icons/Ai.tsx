import BotIcon from '~icons/lucide/bot'
import BotOffIcon from '~icons/lucide/bot-off'
import LucideCircleStop from '~icons/lucide/circle-stop'
import LucideGhost from '~icons/lucide/ghost'
import SparklesIcon from '~icons/lucide/sparkles'
import {SvgIcon} from './Style'

export const IconAi = () => (
  <SvgIcon>
    <SparklesIcon />
  </SvgIcon>
)

export const IconAiAssistant = () => (
  <SvgIcon>
    <BotIcon />
  </SvgIcon>
)

export const IconAiAssistantClose = () => (
  <SvgIcon>
    <BotOffIcon />
  </SvgIcon>
)

export const IconPrivate = () => (
  <SvgIcon>
    <LucideGhost />
  </SvgIcon>
)

export const IconStop = () => (
  <SvgIcon>
    <LucideCircleStop />
  </SvgIcon>
)
