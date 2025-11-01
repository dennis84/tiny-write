import {styled} from 'solid-styled-components'
import explainCodePrompt from '@/prompts/explain-code.md?raw'
import fixCodePrompt from '@/prompts/fix-code.md?raw'
import refactorCodePrompt from '@/prompts/refactor-code.md?raw'
import testCodePrompt from '@/prompts/test-code.md?raw'
import {Button, ButtonGroup} from '../Button'

const SuggestionsContainer = styled('div')`
  margin-top: 10px;
  padding-bottom: 20px;
`

interface Props {
  onSuggestion: (content: string) => void
}

export const Suggestions = (props: Props) => {
  const addMessage = (content: string) => () => {
    props.onSuggestion(content)
  }

  return (
    <SuggestionsContainer>
      <ButtonGroup>
        <Button onClick={addMessage(fixCodePrompt)}>Fix</Button>
        <Button onClick={addMessage(explainCodePrompt)}>Explain</Button>
        <Button onClick={addMessage(refactorCodePrompt)}>Refactor</Button>
        <Button onClick={addMessage(testCodePrompt)}>Test</Button>
      </ButtonGroup>
    </SuggestionsContainer>
  )
}
