import {EditorState} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {createEffect, createSignal, Match, onMount, Show, Suspense, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {getLanguageConfig} from '@/codemirror/highlight'
import {getTheme} from '@/codemirror/theme'
import {useTitle} from '@/hooks/use-title'
import {type Attachment, AttachmentType, useState} from '@/state'
import {Button} from '../Button'
import {IconTextSelectStart, LangIcon} from '../Icon'
import {Tooltip} from '../Tooltip'
import {ChatInputEditor} from './Style'

const Container = styled('div')`
  display: grid;
  justify-items: flex-end;
  gap: 10px;
`

const TooltipAction = styled('div')`
  display: flex;
  justify-content: flex-end;
  margin-top: 5px;
`

const TooltipImage = styled('img')`
  max-width: 200px;
  max-height: 200px;
  border-radius: 10px;
`

const AttachmentImage = styled('img')`
  width: 40px;
  height: 40px;
  border-radius: 10px;
`

interface Props {
  attachment: Attachment
  onDelete?: (attachment: Attachment) => void
}

export const AttachmentChip = (props: Props) => {
  const {configService, fileService} = useState()
  const [tooltipAnchor, setTooltipAnchor] = createSignal<HTMLElement | undefined>()

  const file = props.attachment.fileId
    ? fileService.findFileById(props.attachment.fileId)
    : undefined
  const langConfig = getLanguageConfig(props.attachment.codeLang ?? file?.codeLang)
  const title = useTitle({
    item: file,
    useCurrent: false,
    fallback: false,
  })

  const closeTooltip = () => {
    setTooltipAnchor(undefined)
  }

  const onOpenTooltip = (e: MouseEvent) => {
    setTooltipAnchor(e.currentTarget as HTMLElement)
  }

  const CodeBlock = () => {
    let ref!: HTMLDivElement
    const [editorView, setEditorView] = createSignal<EditorView>()

    const CodeBlockStyle = styled('div')`
      .cm-editor {
        max-width: 400px;
        max-height: 400px;
      }
    `

    onMount(() => {
      const theme = getTheme(configService.codeTheme.value)
      const lines = props.attachment.content.trim()
      const view = new EditorView({
        parent: ref,
        doc: lines,
        extensions: [
          EditorView.editable.of(false),
          EditorState.readOnly.of(true),
          theme,
          langConfig.highlight(),
        ],
      })

      setEditorView(view)
    })

    createEffect(() => {
      const view = editorView()
      if (!view) return

      const content = props.attachment.content.trim()

      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content,
        },
      })
    })

    return <CodeBlockStyle ref={ref} />
  }

  return (
    <>
      <Container>
        <Switch>
          <Match when={props.attachment.type === AttachmentType.Image}>
            <AttachmentImage src={props.attachment.content} alt="" onClick={onOpenTooltip} />
          </Match>
          <Match when={props.attachment.type === AttachmentType.File}>
            <Button onClick={onOpenTooltip}>
              <LangIcon name={langConfig.id} />
              <Suspense>{title() ?? `${langConfig?.name ?? ''} File`}</Suspense>
            </Button>
          </Match>
          <Match when={props.attachment.type === AttachmentType.Selection}>
            <Button onClick={onOpenTooltip}>
              <IconTextSelectStart />
              <Suspense>
                {title() ?? `${langConfig?.name} File`}:{props.attachment.selection?.[0]}-
                {props.attachment.selection?.[1]}
              </Suspense>
            </Button>
          </Match>
        </Switch>
      </Container>
      <Show when={tooltipAnchor()}>
        {(a) => (
          <Tooltip anchor={a()} onClose={() => closeTooltip()}>
            <Switch>
              <Match when={props.attachment.type === AttachmentType.Image}>
                <TooltipImage src={props.attachment.content} alt="" />
              </Match>
              <Match when={true}>
                <ChatInputEditor>
                  <CodeBlock />
                </ChatInputEditor>
              </Match>
            </Switch>
            <Show when={props.onDelete}>
              <TooltipAction>
                <Button onClick={() => props.onDelete?.(props.attachment)}>Remove</Button>
              </TooltipAction>
            </Show>
          </Tooltip>
        )}
      </Show>
    </>
  )
}
