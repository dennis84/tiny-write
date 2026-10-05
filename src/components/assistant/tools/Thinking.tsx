import {Index, Match, Show, Switch} from 'solid-js'
import type {Message, Reasoning, ThinkingItem, ToolCall} from '@/types'
import {ReasoningRow} from './ReasoningRow'
import {WebSearch} from './WebSearch'

interface Props {
  message: Message
}

export const Thinking = (props: Props) => {
  return (
    <Index each={props.message.thinking ?? []}>
      {(item: () => ThinkingItem) => (
        <Switch>
          <Match when={item().kind === 'reasoning'}>
            <ReasoningRow reasoning={item() as Reasoning} />
          </Match>
          <Match when={item().kind === 'tool-call'}>
            <Show when={(item() as ToolCall).toolName === 'braveSearch'}>
              <WebSearch toolCall={item() as ToolCall} />
            </Show>
          </Match>
        </Switch>
      )}
    </Index>
  )
}
