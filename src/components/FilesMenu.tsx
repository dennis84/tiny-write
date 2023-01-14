import {For, JSX, createSignal, onMount, onCleanup, Show} from 'solid-js'
import {unwrap} from 'solid-js/store'
import h from 'solid-js/h'
import {css, cx} from '@emotion/css'
import * as Y from 'yjs'
import {yDocToProsemirror} from 'y-prosemirror'
import {formatDistance} from 'date-fns'
import {arrow, computePosition, flip, offset, shift} from '@floating-ui/dom'
import {File, useState} from '@/state'
import {foreground, primaryBackground} from '@/config'
import * as remote from '@/remote'
import {createExtensions, createSchema} from '@/prosemirror-setup'
import {Drawer, Label} from './Menu'
import {ButtonGroup, button, buttonPrimary} from './Button'

interface Props {
  onBack: () => void;
  onOpenFile: () => void;
}

export const FileList = (props: {children: JSX.Element}) => (
  <nav
    data-tauri-drag-region="true"
    data-testid="file-list"
    class={css`
      margin: 10px 0;
      margin-bottom: 30px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      grid-column-gap: 20px;
    `}>
    {props.children}
  </nav>
)

export const FilesMenu = (props: Props) => {
  const [store, ctrl] = useState()
  const [current, setCurrent] = createSignal()
  let tooltipRef: HTMLDivElement
  let arrowRef: HTMLSpanElement

  const schema = createSchema(createExtensions({
    config: store.config,
    markdown: false,
  }))

  const onOpenFile = (file: File) => {
    ctrl.openFile(unwrap(file))
    props.onOpenFile()
  }

  const onRemove = () => {
    const f = unwrap(current())
    if (f) ctrl.deleteFile(f)
    setCurrent(undefined)
  }

  const onNew = () => {
    ctrl.newFile()
    props.onOpenFile()
  }

  const Excerpt = (p: {file: File}) => {
    const ydoc = new Y.Doc({gc: false})
    Y.applyUpdate(ydoc, p.file.ydoc)
    const doc = yDocToProsemirror(schema, ydoc)
    const maxText = 150
    const maxCode = 80
    const nodes = []
    let len = 0
    let done = false

    doc.descendants((node, _, parent) => {
      if (len >= 150) {
        if (!done) nodes.push(h('span', {}, '…'))
        done = true
        return false
      } else if (node.type.name === 'image') {
        nodes.push(h('img', {src: node.attrs.src, alt: '️🖼️'}))
      } else if (node.type.name === 'video') {
        nodes.push(h('span', {}, '️🎬 '))
      } else if (parent.type.name === 'code_block') {
        let text = node.textContent
        if (text.length > maxCode) {
          text = text.slice(0, maxCode) + '…'
        }
        nodes.push(h('pre', h('code', {}, text)))
        nodes.push(h('span', {}, ' '))
        len += text.length + 1
      } else if (node.isText) {
        const text = node.textContent.slice(0, maxText)
        nodes.push(h('p', {}, text + ' '))
        len += text.length + 1
      }
    })

    return nodes
  }

  const FileLink = (p: {file: File}) => {
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
        }[side]

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
      <div class={css`
        margin-bottom: 20px;
        overflow: hidden;
      `}>
        <div
          class={css`
            height: 140px;
            overflow: hidden;
            margin: 1px;
            padding: 2px 4px;
            word-break: break-all;
            cursor: pointer;
            font-size: 10px;
            line-height: 1.5;
            color: ${foreground(store.config)};
            background: ${foreground(store.config)}11;
            border: 1px solid ${foreground(store.config)}99;
            ${current() === p.file ? `
              border-color: ${primaryBackground(store.config)};
              box-shadow: 0 0 0 1px ${primaryBackground(store.config)};
            ` : ''}
            border-radius: 3px;
            p {
              margin: 0;
            }
            img {
              max-width: 50%;
              float: left;
              margin-right: 2px;
            }
            pre {
              border: 1px solid ${foreground(store.config)}55;
              background: ${foreground(store.config)}11;
              border-radius: 3px;
              padding: 0px;
              margin: 0;
              overflow: hidden;
            }
            &:hover {
              border-color: ${primaryBackground(store.config)};
              box-shadow: 0 0 0 1px ${primaryBackground(store.config)};
            }
          `}
          onClick={() => onOpenFile(p.file)}
          data-testid="open">
          <Show
            when={p.file.path}
            fallback={<Excerpt file={p.file} />}
          >{path()}&nbsp;📎</Show>
        </div>
        <div class={css`
          font-size: 12px;
          margin-top: 5px;
          color: ${foreground(store.config)}99;
          display: flex;
          align-items: center;
        `}>
          <span>{formatDistance(new Date(p.file.lastModified), new Date())}</span>
          <button class={css`
            justify-self: flex-end;
            margin-left: auto;
            background: none;
            border: 0;
            color: ${foreground(store.config)}99;
            cursor: pointer;
            padding: 0;
            ${current() === p.file ? `
              color: ${primaryBackground(store.config)};
            ` : ''}
            &:hover {
              color: ${primaryBackground(store.config)};
            }
          `} onClick={onTooltip}>︙</button>
        </div>
      </div>
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

    return (
      <div
        ref={tooltipRef}
        class={cx('file-tooltip', css`
          position: absolute;
          min-width: 150px;
        `)}>
        <div onClick={onRemove}>🗑️ Delete</div>
        <span ref={arrowRef} class="arrow"></span>
      </div>
    )
  }

  return (
    <Drawer config={store.config}>
      <Label config={store.config}>Files</Label>
      <FileList>
        <For each={store.files}>
          {(file: File) => <FileLink file={file} />}
        </For>
      </FileList>
      <ButtonGroup config={store.config}>
        <button
          class={button(store.config)}
          onClick={props.onBack}
          data-testid="back">
          ↩ Back
        </button>
        <button class={buttonPrimary(store.config)} onClick={onNew}>New doc</button>
      </ButtonGroup>
      <Show when={current() !== undefined}><Tooltip /></Show>
    </Drawer>
  )
}
