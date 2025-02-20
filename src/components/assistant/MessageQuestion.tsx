import {createSignal, Match, onMount, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {EditorView} from '@codemirror/view'
import {EditorState} from '@codemirror/state'
import {Message, MessageType, useState} from '@/state'
import {getTheme} from '@/codemirror/theme'
import {getLanguageConfig} from '@/codemirror/highlight'
import {Button, IconButton} from '../Button'
import {IconEdit, IconTextSelectStart, LangIcon} from '../Icon'
import {TooltipHelp} from '../TooltipHelp'
import {chatBubble} from './Style'
import {MessageInput} from './MessageInput'

const EditBubble = styled('div')`
  flex-basis: 100%;
  margin-bottom: 20px;
`

const QuestionActions = styled('div')`
  display: flex;
  padding: 10px 0;
  height: fit-content;
`

const QuestionContainer = styled('div')`
  display: flex;
  justify-items: flex-end;
  width: fit-content;
  margin-left: auto;
  gap: 5px;
`

const QuestionBubble = styled('div')`
  ${chatBubble}
  padding: 20px;
  background: var(--foreground-10);
  white-space: pre-wrap;
  .cm-editor {
    margin-top: 10px;
  }
`

interface Props {
  message: Message
  onUpdate?: (message: Message) => void
}

export const MessageQuestion = (props: Props) => {
  const {configService, threadService, fileService} = useState()
  const [editing, setEditing] = createSignal(false)
  const [fileTitle, setFileTitle] = createSignal<string>()
  const [showContent, setShowContent] = createSignal(false)

  const file = props.message.fileId ? fileService.findFileById(props.message.fileId) : undefined
  const langConfig = getLanguageConfig(props.message.codeLang ?? file?.codeLang)

  const onEditMessage = async () => {
    setEditing(true)
  }

  const onUpdate = (message: Message) => {
    threadService.updateMessage(message)
    setEditing(false)
    props.onUpdate?.(message)
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
        <QuestionContainer>
          <QuestionActions>
            <TooltipHelp title="Edit message">
              <IconButton onClick={onEditMessage}>
                <IconEdit />
              </IconButton>
            </TooltipHelp>
          </QuestionActions>
          <QuestionBubble>
            <Switch>
              <Match when={props.message.type === MessageType.File}>
                <Button onClick={onShowContent}>
                  <LangIcon name={langConfig.id} /> {fileTitle() ?? `${langConfig?.name ?? ''} File`}
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
          </QuestionBubble>
        </QuestionContainer>
      </Show>
    </>
  )
}
