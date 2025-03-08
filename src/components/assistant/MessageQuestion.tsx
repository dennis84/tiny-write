import {createSignal, Match, onMount, Show, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {EditorView} from '@codemirror/view'
import {EditorState} from '@codemirror/state'
import {Message, MessageType, useState} from '@/state'
import {getTheme} from '@/codemirror/theme'
import {getLanguageConfig} from '@/codemirror/highlight'
import {TreeItem} from '@/tree'
import {Button, IconButton} from '../Button'
import {IconEdit, IconTextSelectStart, LangIcon} from '../Icon'
import {TooltipHelp} from '../TooltipHelp'
import {chatBubble} from './Style'
import {MessageInput} from './MessageInput'
import {Pagination} from './Pagination'

const EditBubble = styled('div')`
  flex-basis: 100%;
`

const QuestionActions = styled('div')`
  display: flex;
  padding: 10px 0;
  height: fit-content;
  margin-left: auto;
`

const QuestionContainer = styled('div')`
  display: grid;
  grid-template-columns: auto 1fr;
  justify-items: flex-end;
  margin-left: auto;
  gap: 5px;
`

const QuestionBubble = styled('div')`
  ${chatBubble}
  padding: 20px;
  background: var(--foreground-10);
  white-space: pre-wrap;
  width: fit-content;
  margin-left: 0;
  .cm-editor {
    margin-top: 10px;
  }
`

const PaginationContainer = styled('div')`
  grid-column: 2 / 2;
  width: 100%;
  display: flex;
  justify-content: flex-end;
  margin-left: auto;
`

interface Props {
  message: TreeItem<Message>
  childrenIds: string[]
  onUpdate?: (message: Message) => void
}

export const MessageQuestion = (props: Props) => {
  const {configService, fileService} = useState()
  const [editing, setEditing] = createSignal(false)
  const [fileTitle, setFileTitle] = createSignal<string>()
  const [showContent, setShowContent] = createSignal(false)

  const file =
    props.message.value.fileId ? fileService.findFileById(props.message.value.fileId) : undefined
  const langConfig = getLanguageConfig(props.message.value.codeLang ?? file?.codeLang)

  const onEditMessage = async () => {
    setEditing(true)
  }

  const onUpdate = (message: Message) => {
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
    <>
      <Show when={editing()}>
        <EditBubble>
          <MessageInput
            onUpdate={onUpdate}
            onCancel={() => setEditing(false)}
            message={props.message.value}
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
          <QuestionBubble data-testid="question_bubble">
            <Switch>
              <Match when={props.message.value.type === MessageType.File}>
                <Button onClick={onShowContent}>
                  <LangIcon name={langConfig.id} />{' '}
                  {fileTitle() ?? `${langConfig?.name ?? ''} File`}
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
              <Match when={true}>{props.message.value.content}</Match>
            </Switch>
          </QuestionBubble>
          <PaginationContainer>
            <Pagination
              id={props.message.id}
              parentId={props.message.parentId}
              childrenIds={props.childrenIds}
            />
          </PaginationContainer>
        </QuestionContainer>
      </Show>
    </>
  )
}
