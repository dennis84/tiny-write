import type {EditorView} from '@codemirror/view'
import {Show, Suspense} from 'solid-js'
import {Portal} from 'solid-js/web'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import * as Y from 'yjs'
import {useTitle} from '@/hooks/use-title'
import {copy} from '@/remote/clipboard'
import {info} from '@/remote/log'
import {useState} from '@/state'
import {IconButton} from '../Button'
import {TooltipHelp} from '../dialog/TooltipHelp'
import {IconAdd, IconCopy, IconMerge} from '../icons/Ui'
import type {CodeFenceInfo} from './MessageMarkdown'

const CodeBlockHeaderEl = styled.div`
  padding: 5px;
  padding-left: 20px;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) min-content min-content;
  align-items: center;
  font-size: 12px;
  font-family: var(--font-family-monospace);
`

export interface CodeBlockHeaderState {
  editorView: EditorView
  dom: Element
  info: CodeFenceInfo
}

export const CodeBlockHeader = (p: {state: CodeBlockHeaderState}) => {
  const {fileService, threadService, locationService} = useState()

  const file = p.state.info.attrs?.id ? fileService.findFileById(p.state.info.attrs.id) : undefined
  const title = useTitle({
    item: file,
    fallback: true,
    useCurrent: false,
  })

  const onCopy = () => copy(p.state.editorView.state.doc.toString())

  const onApply = () => {
    info(`Apply to file (id=${file?.id})`)

    if (!file) return

    const currentThread = threadService.currentThread
    if (!currentThread) return

    const doc = p.state.editorView.state.doc.toString()
    const range = p.state.info.attrs?.range

    locationService.openItem(file, {merge: {doc, range}, threadId: currentThread.id})
  }

  const onCreateFile = async () => {
    const id = uuidv4()
    const ydoc = new Y.Doc({gc: false, guid: id})
    const doc = p.state.editorView.state.doc.toString()
    ydoc.getText(id).insert(0, doc)

    const file = await fileService.newFile({
      id,
      newFile: p.state.info.attrs?.file,
      ydoc: Y.encodeStateAsUpdate(ydoc),
      code: true,
    })

    locationService.openItem(file)
  }

  return (
    <Portal mount={p.state.dom}>
      <Suspense>
        <CodeBlockHeaderEl data-testid="code_block_header">
          <span>{title() ?? p.state.info.lang ?? 'text'}</span>
          <TooltipHelp title="Copy">
            <IconButton onClick={onCopy} data-testid="panel_button_copy">
              <IconCopy />
            </IconButton>
          </TooltipHelp>
          <Show when={!file && p.state.info.attrs?.file}>
            <TooltipHelp title="Create file">
              <IconButton onClick={onCreateFile} data-testid="panel_button_create">
                <IconAdd />
              </IconButton>
            </TooltipHelp>
          </Show>
          <Show when={file}>
            <TooltipHelp title="Apply in editor">
              <IconButton onClick={onApply} data-testid="panel_button_apply">
                <IconMerge />
              </IconButton>
            </TooltipHelp>
          </Show>
        </CodeBlockHeaderEl>
      </Suspense>
    </Portal>
  )
}
