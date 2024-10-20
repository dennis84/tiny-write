import {Show} from 'solid-js'
import {useLocation} from '@solidjs/router'
import {styled} from 'solid-styled-components'
import {ButtonPrimary} from './Button'
import {Icon} from './Icon'

const Container = styled('div')`
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 999;
`

export const Back = () => {
  let container!: HTMLDivElement
  const location = useLocation<{prev: string}>()

  const onBack = () => {
    history.back()
  }

  return (
    <Show when={location.state?.prev}>
      <Container ref={container}>
        <ButtonPrimary onClick={onBack}>
          <Icon>arrow_back</Icon> Back
        </ButtonPrimary>
      </Container>
    </Show>
  )
}
