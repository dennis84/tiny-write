import type {EditorView} from '@codemirror/view'
import {Show, Suspense} from 'solid-js'
import {Portal} from 'solid-js/web'
import {styled} from 'solid-styled-components'
import {v4 as uuidv4} from 'uuid'
import * as Y from 'yjs'
import {useOpen} from '@/hooks/open'
import {useTitle} from '@/hooks/use-title'
import {copy} from '@/remote/clipboard'
import {info} from '@/remote/log'
import {useState} from '@/state'
import {IconButton} from '../Button'
import {IconAdd, IconContentCopy, IconMerge} from '../Icon'
import {TooltipHelp} from '../TooltipHelp'

const ApplyPanelEl = styled('div')`
  position: ${(props: any) => (props.hasTitle ? 'static' : 'absolute')};
  padding: 2px;
  padding-left: 20px;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) min-content min-content;
  align-items: center;
  font-size: 12px;
  font-family: var(--font-family-monospace);
`

export interface ApplyPanelState {
  editorView: EditorView
  dom: Element
  id?: string
  range?: [number, number]
  file?: string
}

export const ApplyPanel = (p: {state: ApplyPanelState}) => {
  const {fileService, threadService, treeService} = useState()
  const {openFile} = useOpen()

  const file = p.state.id ? fileService.findFileById(p.state.id) : undefined
  const title = useTitle({
    item: file,
    fallback: false,
    useCurrent: false,
  })

  const onCopy = () => copy(p.state.editorView.state.doc.toString())

  const onApply = () => {
    info(`Apply to file (id=${file?.id})`)

    if (!file) return

    const currentThread = threadService.currentThread
    if (!currentThread) return

    const doc = p.state.editorView.state.doc.toString()
    const range = p.state.range

    openFile(file, {merge: {doc, range}})
  }

  const onCreateFile = async () => {
    const id = uuidv4()
    const ydoc = new Y.Doc({gc: false, guid: id})
    const doc = p.state.editorView.state.doc.toString()
    ydoc.getText(id).insert(0, doc)

    const file = await fileService.newFile({
      id,
      newFile: p.state.file,
      ydoc: Y.encodeStateAsUpdate(ydoc),
      code: true,
    })

    await treeService.add(file)
    openFile(file)
  }

  return (
    <Portal mount={p.state.dom}>
      <Suspense>
        <ApplyPanelEl hasTitle={title() !== undefined} data-testid="apply_panel">
          <span>{title()}</span>
          <TooltipHelp title="Copy">
            <IconButton onClick={onCopy} data-testid="panel_button_copy">
              <IconContentCopy />
            </IconButton>
          </TooltipHelp>
          <Show when={!file && p.state.file}>
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
        </ApplyPanelEl>
      </Suspense>
    </Portal>
  )
}
