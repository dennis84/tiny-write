import {createSignal, Match, onMount, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {EditorView} from '@codemirror/view'
import {EditorState} from '@codemirror/state'
import {Message, MessageType, useState} from '@/state'
import {getTheme} from '@/codemirror/theme'
import {getLanguageConfig} from '@/codemirror/highlight'
import {Button, IconButton} from '../Button'
import {IconClose, IconEdit, IconMoreVert, IconTextSelectStart, LangIcon} from '../Icon'
import {Tooltip, TooltipButton} from '../Tooltip'
import {chatBubble} from './Style'
import {MessageInput} from './MessageInput'

const EditBubble = styled('div')`
  flex-basis: 100%;
  margin-bottom: 20px;
`

const QuestionBubble = styled('div')`
  ${chatBubble}
  padding: 20px;
  background: var(--foreground-10);
  justify-self: flex-end;
  margin-left: auto;
  width: fit-content;
  .cm-editor {
    margin-top: 10px;
  }
`

const BubbleMenu = styled('div')`
  position: absolute;
  top: 5px;
  right: 5px;
`

interface Props {
  message: Message
}

export const MessageQuestion = (props: Props) => {
  const {configService, threadService, fileService} = useState()
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement>()
  const [editing, setEditing] = createSignal(false)
  const [fileTitle, setFileTitle] = createSignal<string>()
  const [showContent, setShowContent] = createSignal(false)

  const file = props.message.fileId ? fileService.findFileById(props.message.fileId) : undefined
  const langConfig = getLanguageConfig(props.message.codeLang ?? file?.codeLang)

  const onBubbleMenu = (event: MouseEvent) => {
    setTooltipAnchor(event.currentTarget as HTMLElement)
  }

  const closeBubbleMenu = () => {
    setTooltipAnchor(undefined)
  }

  const onRemoveMessage = async () => {
    await threadService.removeMessage(props.message)
    closeBubbleMenu()
  }

  const onEditMessage = async () => {
    closeBubbleMenu()
    setEditing(true)
  }

  const onUpdate = (message: Message) => {
    threadService.updateMessage(message)
    setEditing(false)
  }

  const onShowContent = () => {
    setShowContent(!showContent())
  }

  onMount(async () => {
    setFileTitle(await fileService.getTitle(file, 25, false))
  })

  const CodeBlock = () => {
    let ref!: HTMLDivElement
    onMount(() => {
      const theme = getTheme(configService.codeTheme.value)

      const lines = props.message.content.split('\n')
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
    <>
      <Show when={editing()}>
        <EditBubble>
          <MessageInput
            onUpdate={onUpdate}
            onCancel={() => setEditing(false)}
            message={props.message}
          />
        </EditBubble>
      </Show>
      <Show when={!editing()}>
        <QuestionBubble>
          <Switch>
            <Match when={props.message.type === MessageType.File}>
              <Button onClick={onShowContent}>
                <LangIcon name={langConfig.id} /> {fileTitle() ?? `${langConfig?.name} File`}
              </Button>
              <Show when={showContent()}>
                <CodeBlock />
              </Show>
            </Match>
            <Match when={props.message.type === MessageType.Selection}>
              <Button onClick={onShowContent}>
                <IconTextSelectStart />
                {fileTitle() ?? `${langConfig?.name} File`}:{props.message.selection?.[0]}-
                {props.message.selection?.[1]}
              </Button>
              <Show when={showContent()}>
                <CodeBlock />
              </Show>
            </Match>
            <Match when={true}>{props.message.content}</Match>
          </Switch>
          <BubbleMenu>
            <IconButton onClick={onBubbleMenu}>
              <IconMoreVert />
            </IconButton>
          </BubbleMenu>
        </QuestionBubble>
      </Show>
      <Show when={tooltipAnchor() !== undefined}>
        <Tooltip anchor={tooltipAnchor()!} onClose={closeBubbleMenu} backdrop={true}>
          <TooltipButton onClick={onRemoveMessage}>
            <IconClose />
            Remove message
          </TooltipButton>
          <TooltipButton onClick={onEditMessage}>
            <IconEdit />
            Edit message
          </TooltipButton>
        </Tooltip>
      </Show>
    </>
  )
}
