import {Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import explainCodePrompt from '@/prompts/explain-code.md?raw'
import fixCodePrompt from '@/prompts/fix-code.md?raw'
import refactorCodePrompt from '@/prompts/refactor-code.md?raw'
import testCodePrompt from '@/prompts/test-code.md?raw'
import {useState} from '@/state'
import {AttachmentType} from '@/types'
import {Button, ButtonGroup} from '../Button'

const SuggestionsContainer = styled('div')`
  margin-bottom: 10px;
  button {
    background: var(--foreground-5);
  }
`

interface Props {
  onSuggestion: (content: string) => void
}

export const Suggestions = (props: Props) => {
  const {threadService} = useState()

  const addMessage = (content: string) => {
    props.onSuggestion(content)
  }

  const hasCodeAttachment = () =>
    threadService
      .attachments()
      .some((a) => a.type === AttachmentType.File || a.type === AttachmentType.Selection)

  return (
    <Show when={hasCodeAttachment()}>
      <SuggestionsContainer>
        <ButtonGroup>
          <Button onClick={() => addMessage(fixCodePrompt)}>Fix</Button>
          <Button onClick={() => addMessage(explainCodePrompt)}>Explain</Button>
          <Button onClick={() => addMessage(refactorCodePrompt)}>Refactor</Button>
          <Button onClick={() => addMessage(testCodePrompt)}>Test</Button>
        </ButtonGroup>
      </SuggestionsContainer>
    </Show>
  )
}
