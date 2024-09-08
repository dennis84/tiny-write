import {createEffect, onCleanup, onMount} from 'solid-js'
import {WheelGesture} from '@use-gesture/vanilla'
import {useState} from '@/state'
import {Select} from '../Select'
import {Scroll} from '../Layout'
import {FullEditor} from './Style'
import {BlockHandle} from './BlockHandle'
import {TableControls} from './TableControl'
import {AutocompleteTooltip} from './AutocompleteTooltip'

export const Editor = () => {
  let scrollRef!: HTMLDivElement
  let editorRef!: HTMLDivElement

  const [store, ctrl] = useState()

  onMount(() => {
    const wheel = new WheelGesture(
      scrollRef,
      ({ctrlKey, event, delta: [, dy]}) => {
        if (!ctrlKey) return
        event.preventDefault()
        const max = Math.min(document.body.clientWidth, 1800)
        const currentWidth = store.config.contentWidth
        ctrl.config.updateContentWidth(Math.max(400, Math.min(max, currentWidth - dy)))
      },
      {eventOptions: {passive: false}},
    )

    onCleanup(() => {
      wheel.destroy()
    })
  })

  createEffect(async () => {
    const currentFile = ctrl.file.currentFile
    if (!currentFile || !store.collab) return

    const provider = ctrl.collab.getProvider(currentFile.id)
    if (!provider) {
      ctrl.collab.init(currentFile)
    }

    if (provider && currentFile.editorView === undefined) {
      ctrl.editor.renderEditor(currentFile, editorRef!)
      ctrl.file.currentFile?.editorView?.focus()
    }
  })

  createEffect((prev) => {
    if (!prev) return
    const currentFile = ctrl.file.currentFile
    if (!currentFile) return
    ctrl.editor.updateConfig(currentFile)
    return store.config
  })

  onCleanup(() => {
    ctrl.file.destroy(ctrl.file.currentFile?.id)
  })

  return (
    <Scroll data-tauri-drag-region="true" ref={scrollRef} data-testid="editor_scroll">
      <Select target={() => scrollRef} />
      <FullEditor
        ref={editorRef}
        config={store.config}
        mode={store.mode}
        spellcheck={store.config.spellcheck}
        data-tauri-drag-region="true"
      />
      <BlockHandle
        file={ctrl.file.currentFile}
        mouseMoveArea={() => scrollRef}
        scrollContainer={() => scrollRef}
      />
      <TableControls file={ctrl.file.currentFile} scrollContainer={() => scrollRef} />
      <AutocompleteTooltip file={ctrl.file.currentFile} />
    </Scroll>
  )
}
