import type {EditorView} from 'prosemirror-view'
import {createSignal} from 'solid-js'
import {serialize} from '@/prosemirror/markdown-serialize'
import type {Message} from '@/state'
import {IconButton} from '../Button'
import {IconCheck, IconClose} from '../Icon'
import {TooltipHelp} from '../TooltipHelp'
import {ChatEditor} from './ChatEditor'
import {ChatInputAction, ChatInputBorder, ChatInputEditorRow} from './Style'

interface Props {
  onUpdate: (message: Message) => void
  onCancel: () => void
  message: Message
}

export const MessageInput = (props: Props) => {
  const [editorView, setEditorView] = createSignal<EditorView>()
  const [focused, setFocused] = createSignal(false)

  const onUpdate = () => {
    const view = editorView()
    if (!view) return

    const content = serialize(view.state)
    if (!content) return

    const tr = view.state.tr
    tr.delete(0, view.state.doc.content.size)
    view.dispatch(tr)

    props.onUpdate({...props.message, content})
  }

  const onCancel = () => {
    const view = editorView()
    if (!view) return
    props.onCancel()

    const tr = view.state.tr
    tr.delete(0, view.state.doc.content.size)
    view.dispatch(tr)
  }

  return (
    <ChatInputBorder data-testid="message_input" focused={focused()}>
      <ChatInputEditorRow>
        <ChatEditor
          setEditorView={(view) => setEditorView(view)}
          onSubmit={() => onUpdate()}
          onFocus={setFocused}
        />
        <ChatInputAction>
          <TooltipHelp title="Cancel">
            <IconButton onClick={onCancel}>
              <IconClose />
            </IconButton>
          </TooltipHelp>
          <TooltipHelp title="Update message">
            <IconButton onClick={onUpdate} data-testid="update_message">
              <IconCheck />
            </IconButton>
          </TooltipHelp>
        </ChatInputAction>
      </ChatInputEditorRow>
    </ChatInputBorder>
  )
}
