import {createEffect, createSignal, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import {Message, MessageType, useState} from '@/state'
import {Button, ButtonGroup} from '../Button'
import {IconHelp, IconRepair} from '../Icon'

const SuggestionsContainer = styled('div')`
  margin-top: 20px;
`

interface Props {
  onSuggestion: (message: Message) => void
}

export const Suggestions = (props: Props) => {
  const {threadService} = useState()
  const [hasCode, setHasCode] = createSignal()

  const addMessage = (content: string) => () => {
    props.onSuggestion({id: uuidv4(), role: 'user', content})
  }

  createEffect(() => {
    const currentThread = threadService.currentThread
    setHasCode(
      currentThread?.messages.find(
        (m) => m.type === MessageType.File || m.type === MessageType.Selection,
      ),
    )
  })

  return (
    <Show when={hasCode()}>
      <SuggestionsContainer>
        <ButtonGroup>
          <Button onClick={addMessage('Can you fix the code')}>
            <IconRepair />
            Fix
          </Button>
          <Button onClick={addMessage('Can you explain the code')}>
            <IconHelp />
            Explain
          </Button>
        </ButtonGroup>
      </SuggestionsContainer>
    </Show>
  )
}
