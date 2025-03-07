import {createEffect, createSignal, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {EditorView} from '@codemirror/view'
import * as Y from 'yjs'
import {v4 as uuidv4} from 'uuid'
import {File, useState} from '@/state'
import {useOpen} from '@/open'
import {copy} from '@/remote/clipboard'
import {Portal} from 'solid-js/web'
import {TooltipHelp} from '../TooltipHelp'
import {IconButton} from '../Button'
import {IconAdd, IconContentCopy, IconMerge} from '../Icon'

const ApplyPanelEl = styled('div')`
  position: ${(props: any) => (props.hasTitle ? 'static' : 'absolute')};
  padding: 2px;
  padding-left: 20px;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) min-content min-content;
  align-items: center;
  font-size: 12px;
`

export interface ApplyPanelState {
  editorView: EditorView
  dom: Element
  id?: string
  range?: [number, number]
  file?: string
}

export const ApplyPanel = (p: {state: ApplyPanelState}) => {
  const {store, fileService, toastService, treeService} = useState()
  const [title, setTitle] = createSignal('')
  const [file, setFile] = createSignal<File>()
  const {open} = useOpen()

  onMount(() => {
    const file = p.state.id ? fileService.findFileById(p.state.id) : undefined
    if (file) {
      setFile(file)
      fileService.getTitle(file, 25, false).then((value) => {
        const t = p.state.range ? `${value}:${p.state.range[0]}-${p.state.range[1]}` : value
        setTitle(t ?? '')
      })
    } else if (p.state.file) {
      setTitle(p.state.file)
    }
  })

  const onCopy = () => {
    copy(p.state.editorView.state.doc.toString())
  }

  const onApply = () => {
    const f = file()
    if (!f) return

    const doc = p.state.editorView.state.doc.toString()
    const range = p.state.range

    open(f, {merge: {doc, range}})
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
    open(file)
  }

  createEffect<{id?: string; isMergeView: boolean}>((prev) => {
    const currentFile = fileService.currentFile
    const isMergeView = store.args?.merge !== undefined

    // Don't show if merge is canceled by changing file
    if (prev && currentFile?.id === prev.id && prev.isMergeView === true && isMergeView === false) {
      toastService.open({message: 'All chunks applied ✅', duration: 2000})
      open(fileService.currentFile)
    }

    return {id: currentFile?.id, isMergeView}
  })

  return (
    <Portal mount={p.state.dom}>
      <ApplyPanelEl hasTitle={title() !== ''} data-testid="apply_panel">
        <span>{title()}</span>
        <TooltipHelp title="Copy">
          <IconButton onClick={onCopy} data-testid="panel_button_copy">
            <IconContentCopy />
          </IconButton>
        </TooltipHelp>
        <Show when={!file() && p.state.file}>
          <TooltipHelp title="Create file">
            <IconButton onClick={onCreateFile} data-testid="panel_button_create">
              <IconAdd />
            </IconButton>
          </TooltipHelp>
        </Show>
        <Show when={file()}>
          <TooltipHelp title="Apply in editor">
            <IconButton onClick={onApply} data-testid="panel_button_apply">
              <IconMerge />
            </IconButton>
          </TooltipHelp>
        </Show>
      </ApplyPanelEl>
    </Portal>
  )
}
