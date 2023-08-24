import {For, createSignal, onMount, onCleanup, Show, createEffect} from 'solid-js'
import {unwrap} from 'solid-js/store'
import h from 'solid-js/h'
import {styled} from 'solid-styled-components'
import {Node} from 'prosemirror-model'
import * as Y from 'yjs'
import {yDocToProsemirrorJSON} from 'y-prosemirror'
import {formatDistance} from 'date-fns'
import {arrow, computePosition, flip, offset, shift} from '@floating-ui/dom'
import {File, Mode, useState} from '@/state'
import * as remote from '@/remote'
import {createExtensions, createSchema} from '@/prosemirror-setup'
import {Drawer, Label} from './Menu'
import {ButtonGroup, Button, ButtonPrimary} from './Button'
import {Card, CardContent, CardFooter, CardList, CardMenuButton} from './Layout'

interface Props {
  onBack: () => void;
  onOpen: () => void;
}

export const FilesMenu = (props: Props) => {
  const [store, ctrl] = useState()
  const [current, setCurrent] = createSignal<File>()
  let tooltipRef: HTMLDivElement
  let arrowRef: HTMLSpanElement

  const files = () => store.files
    .filter((f) => f.lastModified)
    .sort((a, b) => b.lastModified!.getTime() - a.lastModified!.getTime())

  const schema = createSchema(createExtensions({ctrl, markdown: false}))

  const onOpenFile = async (file: File) => {
    await ctrl.editor.openFile(unwrap(file))
    props.onOpen()
  }

  const onRemove = () => {
    const f = unwrap(current())
    if (f) ctrl.editor.deleteFile(f)
    setCurrent(undefined)
  }

  const onNewFile = () => {
    ctrl.editor.newFile()
    props.onOpen()
  }

  const onAddToCanvas = () => {
    const f = unwrap(current())
    if (f) ctrl.canvas.addFile(f)
    setCurrent(undefined)
    props.onOpen()
  }

  const Excerpt = (p: {file: File}) => {
    const maxLen = 300
    const maxText = 150
    const maxCode = 80
    const [content, setContent] = createSignal<Node[]>([])

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

  const FileItem = (p: {file: File}) => {
    const [path, setPath] = createSignal<string>()

    const isActive = (): boolean => {
      if (store.mode === Mode.Editor) {
        return ctrl.file.currentFile?.id === p.file.id ?? false
      }

      const elements = ctrl.canvas.currentCanvas?.elements
      return elements?.some((el) => el.selected && el.id === p.file.id) ?? false
    }

    const onTooltip = (e: MouseEvent) => {
      setCurrent(p.file)
      computePosition(e.target as Element, tooltipRef, {
        placement: 'bottom',
        middleware: [
          offset(10),
          flip(),
          shift(),
          arrow({element: arrowRef}),
        ],
      }).then(({x, y, placement, middlewareData}) => {
        tooltipRef.style.left = `${x}px`
        tooltipRef.style.top = `${y}px`

        const side = placement.split('-')[0]
        const staticSide = {
          top: 'bottom',
          right: 'left',
          bottom: 'top',
          left: 'right'
        }[side] ?? 'top'

        if (middlewareData.arrow) {
          const {x, y} = middlewareData.arrow
          Object.assign(arrowRef.style, {
            left: x != null ? `${x}px` : '',
            top: y != null ? `${y}px` : '',
            [staticSide]: `${-arrowRef.offsetWidth / 2}px`
          });
        }
      })
    }

    onMount(async () => {
      if (p.file.path) {
        setPath(await remote.toRelativePath(p.file.path))
      }
    })

    return (
      <Card>
        <CardContent
          onClick={() => onOpenFile(p.file)}
          selected={current() === p.file}
          active={isActive()}
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
        <div onClick={onRemove}>🗑️ Delete</div>
        <Show when={store.mode === Mode.Canvas}>
          <div onClick={onAddToCanvas}>🤏 Add to canvas</div>
        </Show>
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
