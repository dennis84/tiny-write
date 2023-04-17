import {For, createSignal, onMount, onCleanup, Show, createEffect, catchError} from 'solid-js'
import {unwrap} from 'solid-js/store'
import h from 'solid-js/h'
import {Node} from 'prosemirror-model'
import * as Y from 'yjs'
import {yDocToProsemirrorJSON} from 'y-prosemirror'
import {formatDistance} from 'date-fns'
import {arrow, computePosition, flip, offset, shift} from '@floating-ui/dom'
import {File, useState} from '@/state'
import * as remote from '@/remote'
import {createExtensions, createSchema} from '@/prosemirror-setup'
import {Drawer, Label} from './Menu'
import {ButtonGroup, Button, ButtonPrimary} from './Button'
import {styled} from 'solid-styled-components'

interface Props {
  onBack: () => void;
  onOpenFile: () => void;
}

export const FileList = styled('nav')`
  margin: 10px 0;
  margin-bottom: 30px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-column-gap: 20px;
`

const FileCard = styled('div')`
  margin-bottom: 20px;
  overflow: hidden;
`

const FileContent = styled('div')`
  height: 180px;
  overflow: hidden;
  margin: 1px;
  padding: 4px;
  word-break: break-all;
  cursor: pointer;
  font-size: 10px;
  line-height: 1.2;
  color: var(--foreground);
  background: var(--foreground-5);
  border: 1px solid var(--foreground-50);
  ${(props: any) => props.active ? `
    border-color: var(--primary-background);
    box-shadow: 0 0 0 1px var(--primary-background);
  ` : ''}
  ${(props: any) => props.selected ? `
    border-color: var(--primary-background);
    box-shadow: 0 0 0 1px var(--primary-background);
    background: var(--foreground-10);
  ` : ''}
  border-radius: var(--border-radius);
  p {
    margin: 4px 0;
  }
  p:first-child {
    margin: 0;
  }
  h2 {
    margin: 0;
    font-size: 14px;
  }
  img {
    max-width: 50%;
    float: left;
    margin-right: 2px;
  }
  pre {
    border: 1px solid var(--foreground-50);
    background: var(--foreground-10);
    border-radius: var(--border-radius);
    padding: 0 4px;
    margin: 4px 0;
    overflow: hidden;
  }
  &:hover {
    border-color: var(--primary-background);
    box-shadow: 0 0 0 1px var(--primary-background);
    background: var(--foreground-10);
  }
`

const FileFooter = styled('div')`
  font-size: 12px;
  margin-top: 5px;
  color: var(--foreground-60);
  display: flex;
  align-items: flex-start;
`

const FileMenuButton = styled('button')`
  justify-self: flex-end;
  margin-left: auto;
  background: none;
  border: 0;
  color: var(--foreground-60);
  cursor: pointer;
  padding: 0;
  ${(props: any) => props.selected ? `
    color: var(--primary-background);
  ` : ''}
  &:hover {
    color: var(--primary-background);
  }
`

export const FilesMenu = (props: Props) => {
  const [store, ctrl] = useState()
  const [current, setCurrent] = createSignal()
  let tooltipRef: HTMLDivElement
  let arrowRef: HTMLSpanElement

  const files = () => store.files
    .filter((f) => f.lastModified)
    .sort((a, b) => b.lastModified!.getTime() - a.lastModified!.getTime())

  const schema = createSchema(createExtensions({
    state: unwrap(store),
    markdown: false,
  }))

  const onOpenFile = async (file: File) => {
    await ctrl.editor.openFile(unwrap(file))
    props.onOpenFile()
  }

  const onRemove = () => {
    const f = unwrap(current())
    if (f) ctrl.editor.deleteFile(f)
    setCurrent(undefined)
  }

  const onNew = () => {
    ctrl.editor.newFile()
    props.onOpenFile()
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
      const nodes: Node[] = []
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
      <FileCard>
        <FileContent
          onClick={() => onOpenFile(p.file)}
          selected={current() === p.file}
          active={store.editor?.id === p.file.id}
          data-testid="open">
          <Show
            when={p.file.path}
            fallback={<Excerpt file={p.file} />}
          >{path()}&nbsp;📎</Show>
        </FileContent>
        <FileFooter>
          <span>{formatDistance(new Date(p.file.lastModified!), new Date())}</span>
          <FileMenuButton
            selected={current() === p.file}
            onClick={onTooltip}
          >︙</FileMenuButton>
        </FileFooter>
      </FileCard>
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
        <span ref={arrowRef} class="arrow"></span>
      </TooltipEl>
    )
  }

  return (
    <Drawer data-tauri-drag-region="true">
      <Label>Files</Label>
      <FileList
        data-tauri-drag-region="true"
        data-testid="file-list">
        <For each={files()}>
          {(file: File) => <FileItem file={file} />}
        </For>
      </FileList>
      <ButtonGroup>
        <Button onClick={props.onBack} data-testid="back">↩ Back</Button>
        <ButtonPrimary onClick={onNew} data-testid="new-doc">New doc</ButtonPrimary>
      </ButtonGroup>
      <Show when={current() !== undefined}><Tooltip /></Show>
    </Drawer>
  )
}
