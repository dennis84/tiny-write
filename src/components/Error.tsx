import {styled} from 'solid-styled-components'
import {ButtonGroup, ButtonPrimary} from './Button'
import {Content, Layout, Scroll} from './Layout'

const Pre = styled('pre')`
  white-space: pre-wrap;
  word-wrap: break-word;
  background: var(--foreground-10);
  border: 1px solid var(--foreground);
  border-radius: 2px;
  padding: 10px;
`

export const GeneralError = (props: {error: Error}) => {
  console.error(props.error)

  const onReload = () => {
    window.location.reload()
  }

  return (
    <Layout>
      <Scroll data-tauri-drag-region="true" data-testid="error">
        <Content data-tauri-drag-region="true">
          <h1>An error occurred.</h1>
          <Pre>
            <code>{props.error.message}</code>
          </Pre>
          <ButtonGroup>
            <ButtonPrimary onClick={onReload}>Reload</ButtonPrimary>
          </ButtonGroup>
        </Content>
      </Scroll>
    </Layout>
  )
}
