import {For, Show} from 'solid-js'
import {IconGlobe} from '@/components/icons/Ui'
import type {ToolCall} from '@/types'
import {ToolCallResultItem, ToolCallResultList, ToolCallRow, ToolCallTitle} from './Style'

interface WebSearchResult {
  title: string
  url: string
  description?: string
}

export const WebSearch = (params: {toolCall: ToolCall}) => {
  const results = () => (params.toolCall.result as WebSearchResult[] | undefined) ?? []

  return (
    <Show when={params.toolCall.input?.query}>
      {(query) => (
        <ToolCallRow>
          <ToolCallTitle>
            <IconGlobe />
            Web search
          </ToolCallTitle>
          {query()}
          <Show when={results().length > 0}>
            <ToolCallResultList>
              <For each={results()}>
                {(result) => (
                  <ToolCallResultItem
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={result.title}
                  >
                    {result.title || result.url}
                  </ToolCallResultItem>
                )}
              </For>
            </ToolCallResultList>
          </Show>
        </ToolCallRow>
      )}
    </Show>
  )
}
