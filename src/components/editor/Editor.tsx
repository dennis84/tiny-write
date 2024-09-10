import {createEffect, onCleanup, onMount} from 'solid-js'
import {WheelGesture} from '@use-gesture/vanilla'
import {useState} from '@/state'
import {Select} from '../Select'
import {Scroll} from '../Layout'
import {Back} from '../Back'
import {FullEditor} from './Style'
import {BlockHandle} from './BlockHandle'
import {TableControls} from './TableControl'
import {AutocompleteTooltip} from './AutocompleteTooltip'

export const Editor = () => {
  let scrollRef!: HTMLDivElement
  let editorRef!: HTMLDivElement

  const {store, configService, collabService, editorService, fileService} = useState()

  onMount(() => {
    const wheel = new WheelGesture(
      scrollRef,
      ({ctrlKey, event, delta: [, dy]}) => {
        if (!ctrlKey) return
        event.preventDefault()
        const max = Math.min(document.body.clientWidth, 1800)
        const currentWidth = store.config.contentWidth
        configService.updateContentWidth(Math.max(400, Math.min(max, currentWidth - dy)))
      },
      {eventOptions: {passive: false}},
    )

    onCleanup(() => {
      wheel.destroy()
    })
  })

  createEffect(async () => {
    const currentFile = fileService.currentFile
    if (!currentFile || !store.collab) return

    const provider = collabService.getProvider(currentFile.id)
    if (!provider) {
      collabService.init(currentFile)
    }

    if (provider && currentFile.editorView === undefined) {
      editorService.renderEditor(currentFile, editorRef!)
      fileService.currentFile?.editorView?.focus()
    }
  })

  onCleanup(() => {
    fileService.destroy(fileService.currentFile?.id)
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
      <BlockHandle file={fileService.currentFile} mouseMoveArea={() => scrollRef} />
      <TableControls file={fileService.currentFile} />
      <AutocompleteTooltip file={fileService.currentFile} />
      <Back />
    </Scroll>
  )
}
