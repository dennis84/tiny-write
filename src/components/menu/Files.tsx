import {For, createSignal, onMount, Show, createEffect} from 'solid-js'
import {unwrap} from 'solid-js/store'
import h from 'solid-js/h'
import {Node} from 'prosemirror-model'
import * as Y from 'yjs'
import {yDocToProsemirrorJSON} from 'y-prosemirror'
import {formatDistance} from 'date-fns'
import {File, Mode, useState} from '@/state'
import * as remote from '@/remote'
import {createExtensions, createSchema} from '@/prosemirror-setup'
import {Drawer, Label} from './Menu'
import {ButtonGroup, Button, ButtonPrimary} from '@/components/Button'
import {Card, CardContent, CardFooter, CardList, CardMenuButton} from '@/components/Layout'
import {Tooltip} from './Tooltip'

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

export const Files = (props: Props) => {
  const [store, ctrl] = useState()
  const [current, setCurrent] = createSignal<File>()
  const [toolipAnchor, setTooltipAnchor] = createSignal<HTMLElement | undefined>()

  const files = () => store.files
    .filter((f) => f.lastModified && !f.deleted)
    .sort((a, b) => b.lastModified!.getTime() - a.lastModified!.getTime())

  const onOpenFile = async () => {
    const f = unwrap(current())
    if (!f) return
    await ctrl.editor.openFile(unwrap(f))
    closeTooltip()
    props.onOpen()
  }

  const onRemove = () => {
    const f = unwrap(current())
    if (!f) return
    ctrl.file.deleteFile(f)
    closeTooltip()
  }

  const onNewFile = () => {
    if (store.mode === Mode.Canvas) {
      ctrl.canvas.newFile()
    } else {
      ctrl.editor.newFile()
    }

    props.onOpen()
  }

  const onAddToCanvas = () => {
    const f = unwrap(current())
    if (!f) return
    ctrl.canvas.addFile(f)
    ctrl.canvas.select(f.id)
    ctrl.canvas.focus(f.id)
    props.onOpen()
  }

  const showCardMenu = (anchor: HTMLElement, file: File) => {
    setCurrent(file)
    setTooltipAnchor(anchor)
    if (store.mode === Mode.Canvas) {
      ctrl.canvas.select(file.id)
      ctrl.canvas.focus(file.id)
    }
  }

  const closeTooltip = () => {
    setCurrent(undefined)
    setTooltipAnchor(undefined)
  }

  const isOnCanvas = (file?: File): boolean => {
    if (store.mode === Mode.Editor) {
      return false
    }

    const elements = ctrl.canvas.currentCanvas?.elements
    return elements?.some((el) => el.id === file?.id) ?? false
  }

  const FileItem = (p: {file: File}) => {
    let anchor!: HTMLElement
    const [path, setPath] = createSignal<string>()

    const isActive = (): boolean => {
      if (store.mode === Mode.Editor) {
        return ctrl.file.currentFile?.id === p.file.id ?? false
      }

      const elements = ctrl.canvas.currentCanvas?.elements
      return elements?.some((el) => el.selected && el.id === p.file.id) ?? false
    }

    onMount(async () => {
      if (p.file.path) {
        setPath(await remote.toRelativePath(p.file.path))
      }
    })

    return (
      <Card>
        <CardContent
          onClick={() => showCardMenu(anchor, p.file)}
          selected={current() === p.file}
          active={isActive()}
          isOnCanvas={isOnCanvas(p.file)}
          data-testid="open">
          <Show
            when={p.file.path}
            fallback={<Excerpt file={p.file} />}
          >{path()}&nbsp;📎</Show>
        </CardContent>
        <CardFooter>
          <span>{formatDistance(new Date(p.file.lastModified!), new Date())}</span>
          <CardMenuButton
            ref={anchor}
            selected={current() === p.file}
            onClick={() => showCardMenu(anchor, p.file)}
          >︙</CardMenuButton>
        </CardFooter>
      </Card>
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
      <Show when={toolipAnchor() !== undefined}>
        <Tooltip anchor={toolipAnchor()} onClose={() => closeTooltip()}>
          <Show when={store.mode === Mode.Canvas}>
            <Show when={!isOnCanvas(current())}>
              <div onClick={onAddToCanvas}>🫳 Add to canvas</div>
            </Show>
            <div onClick={onOpenFile}>↪️ Open in editor mode</div>
          </Show>
          <Show when={store.mode === Mode.Editor}>
            <div onClick={onOpenFile}>↪️ Open file</div>
          </Show>
          <div onClick={onRemove}>🗑️ Delete</div>
        </Tooltip>
      </Show>
    </Drawer>
  )
}
