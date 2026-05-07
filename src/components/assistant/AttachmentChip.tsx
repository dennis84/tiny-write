import {EditorState} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {createEffect, createSignal, For, Match, onMount, Show, Suspense, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {getLanguageConfig} from '@/codemirror/highlight'
import {getTheme} from '@/codemirror/theme'
import {useDialog} from '@/hooks/use-dialog'
import {useTitle} from '@/hooks/use-title'
import {useState} from '@/state'
import {
  type Attachment,
  AttachmentType,
  type File,
  type FileAttachment,
  type ImageAttachment,
  type ProjectAttachment,
  type SelectionAttachment,
  type TextAttachment,
} from '@/types'
import {Button} from '../Button'
import {DialogFooter, DialogList, TooltipDivider} from '../dialog/Style'
import {IconFolderRoot} from '../icons/File'
import {LangIcon} from '../icons/LangIcon'
import {IconTextCursor} from '../icons/Ui'

const AttachmentButton = styled(Button)`
  white-space: nowrap;
  flex-shrink: 0;
`

const AttachmentImage = styled.img`
  width: var(--button-height);
  height: var(--button-height);
  border-radius: 10px;
  cursor: var(--cursor-pointer);
`

const TooltipImage = styled.img`
  max-width: 200px;
  max-height: 200px;
  border-radius: 10px;
`

interface AttachmentTitleProps {
  file?: File
  codeLang?: string
  selection?: (readonly [number, number])[]
}

const AttachmentTitle = (props: AttachmentTitleProps) => {
  const title = useTitle({
    item: props.file,
    useCurrent: false,
    fallback: false,
  })

  const langConfig = getLanguageConfig(props.codeLang)

  const Selection = () => (
    <Show when={props.selection}>
      {(sel) =>
        sel()
          .map(([from, to]) => `${from}-${to}`)
          .join(' ')
      }
    </Show>
  )

  return (
    <Suspense>
      <Switch>
        <Match when={title()}>
          {title()}
          <Selection />
        </Match>
        <Match when={props.selection}>
          {langConfig.name ?? ''} File:
          <Selection />
        </Match>
        <Match when={props.file}>{langConfig.name ?? ''} File</Match>
        <Match when={true}>Code Block</Match>
      </Switch>
    </Suspense>
  )
}

const CodeBlock = (props: {content: string; codeLang?: string}) => {
  let ref!: HTMLDivElement
  const [editorView, setEditorView] = createSignal<EditorView>()
  const {configService} = useState()
  const langConfig = getLanguageConfig(props.codeLang)

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
    const doc = props.content.trim()
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

    const content = props.content.trim()

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

const TextAttachmentChip = (props: {
  attachment: TextAttachment
  title?: string
  onDelete?: (attachment: Attachment) => void
}) => {
  const Tooltip = () => (
    <>
      <CodeBlock content={props.attachment.content} />
      <Show when={props.onDelete}>
        <DialogFooter>
          <Button onClick={() => onDelete(props.attachment)}>Remove</Button>
        </DialogFooter>
      </Show>
    </>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
  })

  const onOpenTooltip = (e: MouseEvent) => {
    showTooltip({anchor: e.currentTarget as HTMLElement})
  }

  const onDelete = (attachment: Attachment) => {
    closeTooltip()
    props.onDelete?.(attachment)
  }

  return <AttachmentButton onClick={onOpenTooltip}>{props.title ?? 'Text'}</AttachmentButton>
}

const FileAttachmentChip = (props: {
  attachment: FileAttachment
  onDelete?: (attachment: Attachment) => void
}) => {
  const {fileService} = useState()

  const file = props.attachment.fileId
    ? fileService.findFileById(props.attachment.fileId)
    : undefined

  const codeLang = props.attachment.codeLang ?? file?.codeLang

  const Tooltip = () => (
    <>
      <CodeBlock content={props.attachment.content} codeLang={codeLang} />
      <Show when={props.onDelete}>
        <DialogFooter>
          <Button onClick={() => onDelete(props.attachment)}>Remove</Button>
        </DialogFooter>
      </Show>
    </>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
  })

  const onOpenTooltip = (e: MouseEvent) => {
    showTooltip({anchor: e.currentTarget as HTMLElement})
  }

  const onDelete = (attachment: Attachment) => {
    closeTooltip()
    props.onDelete?.(attachment)
  }

  return (
    <AttachmentButton onClick={onOpenTooltip}>
      <LangIcon name={codeLang} />
      <AttachmentTitle file={file} codeLang={codeLang} />
    </AttachmentButton>
  )
}

const ImageAttachmentChip = (props: {
  attachment: ImageAttachment
  onDelete?: (attachment: Attachment) => void
}) => {
  const Tooltip = () => (
    <>
      <TooltipImage src={props.attachment.content} alt="" />
      <Show when={props.onDelete}>
        <DialogFooter>
          <Button onClick={() => onDelete(props.attachment)}>Remove</Button>
        </DialogFooter>
      </Show>
    </>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
  })

  const onOpenTooltip = (e: MouseEvent) => {
    showTooltip({anchor: e.currentTarget as HTMLElement})
  }

  const onDelete = (attachment: Attachment) => {
    closeTooltip()
    props.onDelete?.(attachment)
  }

  return <AttachmentImage src={props.attachment.content} alt="" onClick={onOpenTooltip} />
}

const SelectionAttachmentChip = (props: {
  attachment: SelectionAttachment
  onDelete?: (attachment: Attachment) => void
}) => {
  const {fileService} = useState()

  const file = props.attachment.fileId
    ? fileService.findFileById(props.attachment.fileId)
    : undefined

  const codeLang = props.attachment.codeLang ?? file?.codeLang

  const Tooltip = () => (
    <>
      <CodeBlock content={props.attachment.content} codeLang={codeLang} />
      <Show when={props.onDelete}>
        <DialogFooter>
          <Button onClick={() => onDelete(props.attachment)}>Remove</Button>
        </DialogFooter>
      </Show>
    </>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
  })

  const onOpenTooltip = (e: MouseEvent) => {
    showTooltip({anchor: e.currentTarget as HTMLElement})
  }

  const onDelete = (attachment: Attachment) => {
    closeTooltip()
    props.onDelete?.(attachment)
  }

  return (
    <AttachmentButton onClick={onOpenTooltip}>
      <IconTextCursor />
      <Suspense>
        <AttachmentTitle file={file} codeLang={codeLang} selection={props.attachment.selection} />
      </Suspense>
    </AttachmentButton>
  )
}

const ProjectAttachmentChip = (props: {
  attachment: ProjectAttachment
  onDelete?: (attachment: Attachment) => void
}) => {
  const Tooltip = () => (
    <DialogList>
      <For each={props.attachment.content}>
        {(item) => (
          <Switch>
            <Match when={item.type === AttachmentType.File ? item : undefined}>
              {(it) => <FileAttachmentChip attachment={it()} />}
            </Match>
            <Match when={item.type === AttachmentType.Text ? item : undefined}>
              {(it) => <TextAttachmentChip attachment={it()} />}
            </Match>
          </Switch>
        )}
      </For>
      <TooltipDivider />
      <Show when={props.onDelete}>
        <DialogFooter>
          <Button onClick={() => onDelete(props.attachment)}>Remove</Button>
        </DialogFooter>
      </Show>
    </DialogList>
  )

  const [showTooltip, closeTooltip] = useDialog({
    component: Tooltip,
  })

  const onOpenTooltip = (e: MouseEvent) => {
    showTooltip({anchor: e.currentTarget as HTMLElement})
  }

  const onDelete = (attachment: Attachment) => {
    closeTooltip()
    props.onDelete?.(attachment)
  }

  return (
    <AttachmentButton onClick={onOpenTooltip}>
      <IconFolderRoot />
      {props.attachment.projectName ?? 'Project'}
    </AttachmentButton>
  )
}

interface Props {
  title?: string
  attachment: Attachment
  onDelete?: (attachment: Attachment) => void
}

export const AttachmentChip = (props: Props) => (
  <Switch>
    <Match when={props.attachment.type === AttachmentType.Image ? props.attachment : undefined}>
      {(it) => <ImageAttachmentChip attachment={it()} onDelete={props.onDelete} />}
    </Match>
    <Match when={props.attachment.type === AttachmentType.Text ? props.attachment : undefined}>
      {(it) => (
        <TextAttachmentChip attachment={it()} title={props.title} onDelete={props.onDelete} />
      )}
    </Match>
    <Match when={props.attachment.type === AttachmentType.File ? props.attachment : undefined}>
      {(it) => <FileAttachmentChip attachment={it()} onDelete={props.onDelete} />}
    </Match>
    <Match when={props.attachment.type === AttachmentType.Selection ? props.attachment : undefined}>
      {(it) => <SelectionAttachmentChip attachment={it()} onDelete={props.onDelete} />}
    </Match>
    <Match when={props.attachment.type === AttachmentType.Project ? props.attachment : undefined}>
      {(it) => <ProjectAttachmentChip attachment={it()} onDelete={props.onDelete} />}
    </Match>
  </Switch>
)
