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
  let container!: HTMLDivElement
  const location = useLocation<{prev: string; path?: string[]}>()
  const navigate = useNavigate()

  const onBack = () => {
    if (location.state?.prev) {
      const path = location.state.path
      navigate(location.state.prev, {state: {path}})
    }
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
