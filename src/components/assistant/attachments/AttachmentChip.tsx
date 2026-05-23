import {EditorState} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {createEffect, createSignal, For, Index, Match, onMount, Show, Suspense, Switch} from 'solid-js'
import {styled} from 'solid-styled-components'
import {getLanguageConfig} from '@/codemirror/highlight'
import {getTheme} from '@/codemirror/theme'
import {useTitle} from '@/hooks/use-title'
import {useState} from '@/state'
import {type Attachment, AttachmentType, type File} from '@/types'
import {Button} from '../../Button'
import {FileAttachmentChip} from './FileAttachmentChip'
import {ImageAttachmentChip} from './ImageAttachmentChip'
import {ProjectAttachmentChip} from './ProjectAttachmentChip'
import {SelectionAttachmentChip} from './SelectionAttachmentChip'
import {TextAttachmentChip} from './TextAttachmentChip'

export const AttachmentButton = styled(Button)`
  white-space: nowrap;
  flex-shrink: 0;
  justify-content: flex-start;
`

interface AttachmentTitleProps {
  file?: File
  codeLang?: string
  selection?: (readonly [number, number])[]
}

export const AttachmentTitle = (props: AttachmentTitleProps) => {
  const title = useTitle({
    item: props.file,
    useCurrent: false,
    fallback: false,
  })

  const langConfig = getLanguageConfig(props.codeLang)

  const Selection = () => (
    <For each={props.selection}>
      {([from, to]) => <>{from}-{to} </>}
    </For>
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

export const CodeBlock = (props: {content: string; codeLang?: string}) => {
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
