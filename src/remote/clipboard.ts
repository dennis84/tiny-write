import * as clipboard from '@tauri-apps/plugin-clipboard-manager'
import {EditorState} from 'prosemirror-state'
import {isTauri} from '@/env'
import {serialize} from '@/markdown'

export const copy = async (text: string): Promise<void> => {
  if (isTauri()) {
    return clipboard.writeText(text)
  } else {
    await navigator.clipboard.writeText(text)
  }
}

export const copyAllAsMarkdown = async (state: EditorState): Promise<void> => {
  const text = serialize(state)
  if (isTauri()) {
    return clipboard.writeText(text)
  } else {
    await navigator.clipboard.writeText(text)
  }
}
