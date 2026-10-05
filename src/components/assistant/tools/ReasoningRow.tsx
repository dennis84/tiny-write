import {differenceInSeconds, formatDuration} from 'date-fns'
import {Show} from 'solid-js'
import {IconLightbulb} from '@/components/icons/Ui'
import type {Reasoning} from '@/types'
import {ToolCallContent} from './Style'
import {ThinkingRow} from './ThinkingRow'

export const ReasoningRow = (props: {reasoning: Reasoning}) => {
  const duration = () => {
    const endDate = props.reasoning.endDate
    if (!endDate) return undefined
    const seconds = differenceInSeconds(endDate, props.reasoning.startDate)
    return formatDuration({seconds: Math.max(seconds, 1)})
  }

  return (
    <ThinkingRow
      loading={props.reasoning.startDate && !props.reasoning.endDate}
      icon={<IconLightbulb />}
      title={
        <Show when={duration()} fallback={<>Thinking …</>}>
          {(d) => <>Thought for {d()}</>}
        </Show>
      }
      content={<ToolCallContent>{props.reasoning.content}</ToolCallContent>}
    />
  )
}
