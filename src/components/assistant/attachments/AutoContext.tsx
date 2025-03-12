import {Show} from 'solid-js'
import {v4 as uuidv4} from 'uuid'
import {Message, MessageType, useState} from '@/state'
import {IconCodeBlocks, IconToggleOn} from '@/components/Icon'
import {TooltipButton} from '@/components/Tooltip'
import {createCodeFence, useCurrentFile} from '../util'
import {TooltipHelp} from '@/components/TooltipHelp'

interface Props {
  onAttachment: (message: Message) => void
}

export const AutoContextButton = (props: Props) => {
  const currentFile = useCurrentFile()
  const {aiService} = useState()

  const onClick = async () => {
    await aiService.setAutoContext(true)

    // const editorView = currentFile()?.codeEditorView
    // if (!editorView) return
    //
    // const content = createCodeFence({
    //   id: currentFile()?.id,
    //   code: editorView.state.doc.toString(),
    //   lang: currentFile()?.codeLang,
    //   path: currentFile()?.path,
    // })
    //
    // props.onAttachment({
    //   id: uuidv4(),
    //   role: 'user',
    //   content,
    //   type: MessageType.File,
    //   fileId: currentFile()?.id,
    // })
  }

  return (
    <Show when={currentFile()?.code}>
      <TooltipHelp title="Adds the current file to context automatically">
        <TooltipButton onClick={onClick}>
          <IconToggleOn />
          Switch on auto context
        </TooltipButton>
      </TooltipHelp>
    </Show>
  )
}
