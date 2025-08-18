import {EditorState} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {createSignal, Match, onMount, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {getLanguageConfig} from '@/codemirror/highlight'
import {getTheme} from '@/codemirror/theme'
import {type Message, MessageType, useState} from '@/state'
import type {TreeItem} from '@/tree'
import {Button, ButtonGroup, IconButton} from '../Button'
import {IconDelete, IconTextSelectStart, LangIcon} from '../Icon'
import {chatBubble} from './Style'

const Container = styled('div')`
  display: grid;
  justify-items: flex-end;
  margin-left: auto;
  gap: 5px;
  ${chatBubble}
`

interface Props {
  message: TreeItem<Message>
}

export const MessageAttachment = (props: Props) => {
  const {configService, fileService, threadService} = useState()
  const [fileTitle, setFileTitle] = createSignal<string>()
  const [showContent, setShowContent] = createSignal(false)

  const file = props.message.value.fileId
    ? fileService.findFileById(props.message.value.fileId)
    : undefined
  const langConfig = getLanguageConfig(props.message.value.codeLang ?? file?.codeLang)

  const onShowContent = () => {
    setShowContent(!showContent())
  }

  const onDelete = () => {
    threadService.removeMessage(props.message.value)
  }

  onMount(async () => {
    setFileTitle(await fileService.getTitle(file, 25, false))
  })

  const CodeBlock = () => {
    let ref!: HTMLDivElement
    onMount(() => {
      const theme = getTheme(configService.codeTheme.value)

      const lines = props.message.value.content.split('\n')
      lines.shift()
      lines.pop()

      new EditorView({
        parent: ref,
        doc: lines.join('\n'),
        extensions: [
          EditorView.editable.of(false),
          EditorState.readOnly.of(true),
          EditorView.lineWrapping,
          theme,
          langConfig.highlight(),
        ],
      })
    })

    return <div ref={ref} />
  }

  return (
    <Container>
      <Switch>
        <Match when={props.message.value.type === MessageType.File}>
          <Button onClick={onShowContent}>
            <LangIcon name={langConfig.id} /> {fileTitle() ?? `${langConfig?.name ?? ''} File`}
          </Button>
          <Show when={showContent()}>
            <CodeBlock />
          </Show>
        </Match>
        <Match when={props.message.value.type === MessageType.Selection}>
          <Button onClick={onShowContent}>
            <IconTextSelectStart />
            {fileTitle() ?? `${langConfig?.name} File`}:{props.message.value.selection?.[0]}-
            {props.message.value.selection?.[1]}
          </Button>
          <Show when={showContent()}>
            <CodeBlock />
          </Show>
        </Match>
      </Switch>
      <Show when={!props.message.childrenIds.length}>
        <ButtonGroup>
          <IconButton onClick={onDelete}>
            <IconDelete />
          </IconButton>
        </ButtonGroup>
      </Show>
    </Container>
  )
}
