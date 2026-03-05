import {EditorState} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {createEffect, createSignal, Match, onMount, Show, Suspense, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {getLanguageConfig, type LangConfig} from '@/codemirror/highlight'
import {getTheme} from '@/codemirror/theme'
import {useDialog} from '@/hooks/use-dialog'
import {useTitle} from '@/hooks/use-title'
import {useState} from '@/state'
import {type Attachment, AttachmentType, type File} from '@/types'
import {Button} from '../Button'
import {DialogFooter} from '../dialog/Style'
import {LangIcon} from '../icons/LangIcon'
import {IconTextCursor} from '../icons/Ui'

const Container = styled.div`
  display: grid;
  justify-items: flex-end;
  gap: 10px;
  button {
    background: var(--background-95);
  }
`

const TooltipImage = styled.img`
  max-width: 200px;
  max-height: 200px;
  border-radius: 10px;
`

const AttachmentImage = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 10px;
`

interface AttachmentTitleProps {
  file?: File
  langConfig?: LangConfig
  selection?: [number, number]
}

const AttachmentTitle = (props: AttachmentTitleProps) => {
  const title = useTitle({
    item: props.file,
    useCurrent: false,
    fallback: false,
  })

  const selection = () =>
    props.selection ? `:${props.selection?.[0]}-${props.selection?.[1]}` : ''

  return (
    <Suspense>
      <Switch>
        <Match when={title()}>
          {title()}
          {selection()}
        </Match>
        <Match when={props.file}>
          {props.langConfig?.name ?? ''} File{selection()}
        </Match>
        <Match when={true}>Code Block</Match>
      </Switch>
    </Suspense>
  )
}

interface Props {
  title?: string
  attachment: Attachment
  onDelete?: (attachment: Attachment) => void
}

export const AttachmentChip = (props: Props) => {
  const {configService, fileService} = useState()

  const file = props.attachment.fileId
    ? fileService.findFileById(props.attachment.fileId)
    : undefined
  const langConfig = getLanguageConfig(props.attachment.codeLang ?? file?.codeLang)

  const CodeBlock = () => {
    let ref!: HTMLDivElement
    const [editorView, setEditorView] = createSignal<EditorView>()

    const CodeBlockStyle = styled.div`
      .cm-editor {
        max-width: 400px;
        max-height: 400px;
        border-radius: var(--border-radius);
        padding: 10px;
      }
    `

    onMount(() => {
      const theme = getTheme(configService.codeTheme.value)
      const doc = props.attachment.content.trim()
      const view = new EditorView({
        parent: ref,
        doc,
        extensions: [
          EditorView.editable.of(false),
          EditorState.readOnly.of(true),
          EditorView.lineWrapping,
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

  const Tooltip = () => (
    <>
      <Switch>
        <Match when={props.attachment.type === AttachmentType.Image}>
          <TooltipImage src={props.attachment.content} alt="" />
        </Match>
        <Match when={true}>
          <CodeBlock />
        </Match>
      </Switch>
      <Show when={props.onDelete}>
        <DialogFooter>
          <Button onClick={() => onDelete(props.attachment)}>Remove</Button>
        </DialogFooter>
      </Show>
    </>
  )

  const [showTooltip, closeTooltip, currentTooltip] = useDialog({
    component: Tooltip,
  })

  const onOpenTooltip = (e: MouseEvent) => {
    if (currentTooltip()) {
      closeTooltip()
    } else {
      showTooltip({anchor: e.currentTarget as HTMLElement})
    }
  }

  const onDelete = (attachment: Attachment) => {
    closeTooltip()
    props.onDelete?.(attachment)
  }

  return (
    <Container>
      <Switch>
        <Match when={props.attachment.type === AttachmentType.Image}>
          <AttachmentImage src={props.attachment.content} alt="" onClick={onOpenTooltip} />
        </Match>
        <Match when={props.attachment.type === AttachmentType.Text}>
          <Button onClick={onOpenTooltip}>{props.title ?? 'Text'}</Button>
        </Match>
        <Match when={props.attachment.type === AttachmentType.File}>
          <Button onClick={onOpenTooltip}>
            <LangIcon name={langConfig.id} />
            <AttachmentTitle file={file} langConfig={langConfig} />
          </Button>
        </Match>
        <Match when={props.attachment.type === AttachmentType.Selection}>
          <Button onClick={onOpenTooltip}>
            <IconTextCursor />
            <Suspense>
              <AttachmentTitle
                file={file}
                langConfig={langConfig}
                selection={props.attachment.selection}
              />
            </Suspense>
          </Button>
        </Match>
      </Switch>
    </Container>
  )
}
