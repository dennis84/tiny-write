import {For, createSignal, onMount, onCleanup, Show, createEffect} from 'solid-js'
import {unwrap} from 'solid-js/store'
import h from 'solid-js/h'
import {styled} from 'solid-styled-components'
import {Node} from 'prosemirror-model'
import * as Y from 'yjs'
import {yDocToProsemirrorJSON} from 'y-prosemirror'
import {formatDistance} from 'date-fns'
import {File, Mode, useState} from '@/state'
import * as remote from '@/remote'
import {createExtensions, createSchema} from '@/prosemirror-setup'
import {Drawer, Label} from './Menu'
import {ButtonGroup, Button, ButtonPrimary} from './Button'
import {Card, CardContent, CardFooter, CardList, CardMenuButton} from './Layout'
import {computeTooltipPosition} from './MenuTooltip'

interface Props {
  onBack: () => void;
  onOpen: () => void;
}

export const Excerpt = (p: {file: File}) => {
  const [, ctrl] = useState()
  const maxLen = 300
  const maxText = 150
  const maxCode = 80
  const [content, setContent] = createSignal<Node[]>([])

  const schema = createSchema(createExtensions({ctrl, markdown: false}))

  createEffect(() => {
    const ydoc = new Y.Doc({gc: false})
    Y.applyUpdate(ydoc, p.file.ydoc)
    const state = yDocToProsemirrorJSON(ydoc, p.file.id)
    const doc = Node.fromJSON(schema, state)
    const nodes: any = []
    let len = 0
    let done = false

    doc.descendants((node, _, parent) => {
      if (len >= maxLen) {
        if (!done) nodes.push(h('span', {}, '…'))
        done = true
        return false
      } else if (node.type.name === 'image') {
        nodes.push(h('img', {src: node.attrs.src, alt: '️🖼️'}))
      } else if (node.type.name === 'video') {
        nodes.push(h('span', {}, '️🎬 '))
      } else if (parent?.type.name === 'code_block') {
        let text = node.textContent
        if (text.length > maxCode) {
          text = text.slice(0, maxCode) + '…'
        }
        nodes.push(h('pre', h('code', {}, text)))
        nodes.push(h('span', {}, ' '))
        len += text.length + 1
      } else if (node.isText) {
        const nodeType = parent?.type.name === 'heading' ? 'h2' : 'p'
        let text = node.textContent
        if (text.length > maxText) {
          text = text.slice(0, maxText) + '…'
        }
        nodes.push(h(nodeType, {}, text + ' '))
        len += text.length + 1
      }
    })

    setContent(nodes)
  })

  return <>{content()}</>
}

export const FilesMenu = (props: Props) => {
  const [store, ctrl] = useState()
  const [current, setCurrent] = createSignal<File>()
  let tooltipRef: HTMLDivElement
  let arrowRef: HTMLSpanElement

  const files = () => store.files
    .filter((f) => f.lastModified)
    .sort((a, b) => b.lastModified!.getTime() - a.lastModified!.getTime())

  const onOpenFile = async (file?: File) => {
    if (!file) return
    await ctrl.editor.openFile(unwrap(file))
    setCurrent(undefined)
    props.onOpen()
  }

  const onRemove = () => {
    const f = unwrap(current())
    if (!f) return

    if (store.mode === Mode.Canvas) {
      ctrl.canvas.removeElement(f.id)
    }

    if (f) ctrl.editor.deleteFile(f)
    setCurrent(undefined)
  }

  const onNewFile = () => {
    if (store.mode === Mode.Canvas) {
      ctrl.canvas.newFile()
    } else {
      ctrl.editor.newFile()
    }

    props.onOpen()
  }

  const onAddToCanvas = (file: File) => {
    ctrl.canvas.addFile(file)
    ctrl.canvas.select(file.id)
    ctrl.canvas.focus(file.id)
    props.onOpen()
  }

  const FileItem = (p: {file: File}) => {
    const [path, setPath] = createSignal<string>()

    const onCardClick = () => {
      if (store.mode === Mode.Canvas) {
        onAddToCanvas(p.file)
      } else {
        onOpenFile(p.file)
      }
    }

    const isActive = (): boolean => {
      if (store.mode === Mode.Editor) {
        return ctrl.file.currentFile?.id === p.file.id ?? false
      }

      const elements = ctrl.canvas.currentCanvas?.elements
      return elements?.some((el) => el.selected && el.id === p.file.id) ?? false
    }

    const isOnCanvas = (): boolean => {
      if (store.mode === Mode.Editor) {
        return false
      }

      const elements = ctrl.canvas.currentCanvas?.elements
      return elements?.some((el) => el.id === p.file.id) ?? false
    }

    const onTooltip = (e: MouseEvent) => {
      setCurrent(p.file)
      computeTooltipPosition(e.target as HTMLElement, tooltipRef, arrowRef)
    }

    onMount(async () => {
      if (p.file.path) {
        setPath(await remote.toRelativePath(p.file.path))
      }
    })

    return (
      <Card>
        <CardContent
          onClick={onCardClick}
          selected={current() === p.file}
          active={isActive()}
          isOnCanvas={isOnCanvas()}
          data-testid="open">
          <Show
            when={p.file.path}
            fallback={<Excerpt file={p.file} />}
          >{path()}&nbsp;📎</Show>
        </CardContent>
        <CardFooter>
          <span>{formatDistance(new Date(p.file.lastModified!), new Date())}</span>
          <CardMenuButton
            selected={current() === p.file}
            onClick={onTooltip}
          >︙</CardMenuButton>
        </CardFooter>
      </Card>
    )
  }

  const Tooltip = () => {
    onMount(() => {
      const listener = (e: MouseEvent) => {
        if ((e.target as Element).closest('.file-tooltip')) return
        setCurrent(undefined)
      }

      document.addEventListener('click', listener)
      onCleanup(() => document.removeEventListener('click', listener))
    })

    const TooltipEl = styled('div')`
      position: absolute;
      min-width: 150px;
    `

    return (
      <TooltipEl
        ref={tooltipRef}
        class="file-tooltip">
        <Show when={store.mode === Mode.Canvas}>
          <div onClick={() => onOpenFile(current())}>↪️ Open in editor mode</div>
        </Show>
        <div onClick={onRemove}>🗑️ Delete</div>
        <span ref={arrowRef} class="arrow"></span>
      </TooltipEl>
    )
  }

  return (
    <Drawer data-tauri-drag-region="true">
      <Label>Files</Label>
      <CardList
        data-tauri-drag-region="true"
        data-testid="file_list">
        <For each={files()}>
          {(file: File) => <FileItem file={file} />}
        </For>
      </CardList>
      <ButtonGroup>
        <Button onClick={props.onBack} data-testid="back">↩ Back</Button>
        <ButtonPrimary onClick={onNewFile} data-testid="new_doc">New doc</ButtonPrimary>
      </ButtonGroup>
      <Show when={current() !== undefined}><Tooltip /></Show>
    </Drawer>
  )
}
