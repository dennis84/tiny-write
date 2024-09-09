import {Show} from 'solid-js'
import {useLocation, useNavigate} from '@solidjs/router'
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
  const location = useLocation<{prev: string}>()
  const navigate = useNavigate()

  const onBack = () => {
    if (location.state?.prev) navigate(location.state.prev)
  }

  return (
    <Show when={location.state?.prev}>
      <Container>
        <ButtonPrimary onClick={onBack}>
          <Icon>arrow_back</Icon> Back
        </ButtonPrimary>
      </Container>
    </Show>
  )
}
