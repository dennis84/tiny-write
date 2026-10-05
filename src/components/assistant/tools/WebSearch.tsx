import {For} from 'solid-js'
import {IconGlobe, IconSearch} from '@/components/icons/Ui'
import type {ToolCall} from '@/types'
import {ToolCallLink} from './Style'
import {ThinkingRow} from './ThinkingRow'

interface WebSearchResult {
  title: string
  url: string
  description?: string
}

export const WebSearch = (props: {toolCall: ToolCall}) => {
  const results = () => (props.toolCall.result as WebSearchResult[] | undefined) ?? []

  return (
    <ThinkingRow
      loading={props.toolCall.startDate && !props.toolCall.endDate}
      icon={<IconGlobe />}
      title={props.toolCall.input?.query ?? 'Searching …'}
      content={
        <For each={results()}>
          {(result) => (
            <ToolCallLink href={result.url} target="_blank" rel="noopener noreferrer">
              <IconSearch />
              {result.title || result.url}
            </ToolCallLink>
          )}
        </For>
      }
    />
  )
}
