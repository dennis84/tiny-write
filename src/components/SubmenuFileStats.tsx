import {createEffect, createSignal, Show} from 'solid-js'
import {Node} from 'prosemirror-model'
import {differenceInHours, format} from 'date-fns'
import * as Y from 'yjs'
import {useState} from '@/state'
import {Label, Sub, Text} from './Menu'

export default () => {
  const [store, ctrl] = useState()
  const [textStats, setTextStats] = createSignal({
    paragraphs: 0,
    words: 0,
    loc: 0,
  })

  createEffect(() => {
    const currentFile = ctrl.file.currentFile

    let paragraphs = 0
    let words = 0
    let loc = 0

    if (!currentFile?.editorView) return

    currentFile?.editorView.state.doc.forEach((node: Node) => {
      const text = node.textContent

      if (node.type.name === 'code_block') {
        loc += text.split('\n').length
        return
      }

      const curWords = text.split(/\s+/).filter((x) => x != '').length
      if (node.type.name === 'paragraph' && curWords > 0) {
        paragraphs ++
      }

      words += curWords
    })

    setTextStats({paragraphs, words, loc})
    return ctrl.file.currentFile?.lastModified
  }, ctrl.file.currentFile?.lastModified)

  const LastModified = () => {
    const formatDate = (date: Date) => {
      const now = new Date()

      if (differenceInHours(now, date) <= 24) {
        return format(date, 'HH:mm:ss')
      } else if (date.getFullYear() === now.getFullYear()) {
        return format(date, 'dd MMMM HH:mm:ss')
      }

      return format(date, 'dd MMMM yyyy HH:mm:ss')
    }

    return (
      <Show when={ctrl.file.currentFile?.lastModified !== undefined} fallback={
        <Text data-testid="last_modified">
          Nothing yet
        </Text>
      }>
        <Text data-testid="last_modified">
          Last modified: {formatDate(ctrl.file.currentFile!.lastModified!)}
        </Text>
      </Show>
    )
  }

  const StorageStats = () => {
    const [ydocSize, setYdocSize] = createSignal(0)

    createEffect(() => {
      if (!store.collab?.ydoc) return
      setYdocSize(Y.encodeStateAsUpdate(store.collab.ydoc).byteLength)
    })

    return (
      <>
        <Text>
          File size: {(ydocSize() / 1024 / 1024).toFixed(2)} MiB
        </Text>
        <Text>
          DB size used: {(store.storageSize / 1024 / 1024).toFixed(2)} MiB
        </Text>
      </>
    )
  }

  return (
    <>
      <Label>Stats</Label>
      <Sub data-tauri-drag-region="true">
        <LastModified />
        <StorageStats />
        <Text>Words: {textStats().words}</Text>
        <Text>Paragraphs: {textStats().paragraphs}</Text>
        <Text>Lines of code: {textStats().loc}</Text>
      </Sub>
    </>
  )
}
