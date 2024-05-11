import {createEffect, onCleanup} from 'solid-js'
import {WheelGesture} from '@use-gesture/vanilla'
import {Mode, useState} from '@/state'
import Select from '../Select';
import {Scroll} from '../Layout'
import {FullEditor} from './Style'

export const Editor = () => {
  let scrollRef!: HTMLDivElement
  let editorRef!: HTMLDivElement

  const [store, ctrl] = useState()

  // Render editor if change file
  createEffect(async () => {
    const currentFile = ctrl.file.currentFile
    if (
      store.mode === Mode.Editor &&
      !store.args?.dir &&
      currentFile?.id &&
      currentFile.editorView === undefined
    ) {
      ctrl.editor.renderEditor(editorRef!)
    }
  })

  createEffect(() => {
    if (store.mode === Mode.Canvas) return

    const wheel = new WheelGesture(scrollRef, ({ctrlKey, event, delta: [, dy]}) => {
      if (!ctrlKey) return
      event.preventDefault()
      const max = Math.min(document.body.clientWidth, 1800)
      const currentWidth = store.config.contentWidth
      ctrl.config.updateContentWidth(Math.max(400, Math.min(max, currentWidth - dy)))
    }, {eventOptions: {passive: false}})

    onCleanup(() => {
      wheel.destroy()
    })
  })

  onCleanup(() => {
    ctrl.file.destroy()
  })

  return (
    <Scroll data-tauri-drag-region="true" ref={scrollRef}>
      <Select target={() => scrollRef} />
      <FullEditor
        ref={editorRef}
        config={store.config}
        mode={store.mode}
        spellcheck={store.config.spellcheck}
        data-tauri-drag-region="true"
      />
    </Scroll>
  )
}
