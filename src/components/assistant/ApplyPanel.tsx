import {createSignal, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {EditorView} from '@codemirror/view'
import {File, useState} from '@/state'
import {copy} from '@/remote/clipboard'
import {Portal} from 'solid-js/web'
import {TooltipHelp} from '../TooltipHelp'
import {IconButton} from '../Button'
import {IconContentCopy, IconMerge} from '../Icon'

const ApplyPanelEl = styled('div')`
  padding: 2px;
  padding-left: 10px;
  border-top-left-radius: var(--border-radius);
  border-top-right-radius: var(--border-radius);
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
}

export const ApplyPanel = (p: {state: ApplyPanelState}) => {
  const {codeService, fileService, toastService} = useState()
  const [title, setTitle] = createSignal('')
  const [file, setFile] = createSignal<File>()

  onMount(() => {
    const file = p.state.id ? fileService.findFileById(p.state.id) : undefined
    setFile(file)

    fileService.getTitle(file, 25, false).then((value) => {
      const t = p.state.range ? `${value}:${p.state.range[0]}-${p.state.range[1]}` : value
      setTitle(t ?? '')
    })
  })

  const onCopy = () => {
    copy(p.state.editorView.state.doc.toString())
  }

  const onApply = () => {
    const f = file()
    if (!f) return
    const newCode = p.state.editorView.state.doc.toString()
    codeService.merge(f, newCode, p.state.range, () => {
      toastService.open({message: 'All chunks applied ✅', duration: 2000})
    })
  }

  return (
    <Portal mount={p.state.dom}>
      <ApplyPanelEl>
        <span>{title()}</span>
        <TooltipHelp title="Copy">
          <IconButton onClick={onCopy}>
            <IconContentCopy />
          </IconButton>
        </TooltipHelp>
        <Show when={file()}>
          <TooltipHelp title="Apply in editor">
            <IconButton onClick={onApply}>
              <IconMerge />
            </IconButton>
          </TooltipHelp>
        </Show>
      </ApplyPanelEl>
    </Portal>
  )
}
