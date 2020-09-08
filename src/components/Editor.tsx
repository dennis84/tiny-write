import React, {useEffect, useLayoutEffect, useCallback, useRef, useMemo} from 'react'
import {Slate, Editable, ReactEditor, withReact} from 'slate-react'
import {Editor, Node as SlateNode, Point, Range, Transforms, createEditor} from 'slate'
import {withHistory} from 'slate-history'
import styled from '@emotion/styled'
import isImage from 'is-image'
import {Config, File} from '..'
import {rgb, rgba} from '../styles'
import {color, color2, codeTheme, font} from '../config'
import {UpdateText, useDispatch} from '../reducer'
import {usePrevious} from '../use-previous'
import CodeEditor from './CodeEditor'
import Image from './Image'
import Link from './Link'

const Container = styled.div<any>`
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 50px);
  max-height: calc(100vh - 50px);
  overflow-y: auto;
  padding: 0 50px;
  display: flex;
  justify-content: center;
  > [contenteditable] {
    min-height: calc(100% - 100px);
    height: fit-content;
    width: 100%;
    max-width: 800px;
    font-size: 24px;
    font-family: ${props => font(props.theme)};
    color: ${props => rgb(color(props.theme))};
    margin-top: 50px;
    padding-bottom: 77vh;
    line-height: 160%;
    outline: none;
    background: transparent;
    -webkit-app-region: no-drag;
    &::-webkit-scrollbar {
      display: none;
    }
    p {
      margin: 0;
    }
    blockquote {
      border-left: 10px solid ${props => rgba(color(props.theme), 0.2)};
      margin: 0;
      padding-left: 20px;
    }
    code {
      border: 1px solid ${props => rgba(color(props.theme), 0.5)};
      background: ${props => rgba(color(props.theme), 0.1)};
      border-radius: 2px;
      padding: 2px;
    }
    a {
      color: ${props => rgba(color2(props.theme), 1)};
    }
  }
`

interface Props {
  text: SlateNode[];
  lastModified?: Date;
  files: File[];
  config: Config;
  loading: boolean;
}

const SHORTCUTS = {
  '*': 'list-item',
  '-': 'list-item',
  '+': 'list-item',
  '>': 'block-quote',
  '#': 'heading-one',
  '##': 'heading-two',
  '###': 'heading-three',
  '####': 'heading-four',
  '#####': 'heading-five',
  '######': 'heading-six',
}

const withCustoms = (config, editor) => {
  const {deleteBackward, insertText, isVoid, isInline, insertData} = editor

  editor.isVoid = (element) =>
    element.type === 'code-block' ||
    element.type === 'image' ?
    true : isVoid(element)

  editor.isInline = element =>
    element.type === 'link' ||
    element.type === 'code' ?
    true : isInline(element)

  editor.insertText = (text) => {
    const {selection} = editor

    if (text === ' ' && selection && Range.isCollapsed(selection)) {
      const {anchor} = selection
      const block = Editor.above(editor, {
        match: n => Editor.isBlock(editor, n),
      })
      const path = block ? block[1] : []
      const start = Editor.start(editor, path)
      const range = {anchor, focus: start}
      const beforeText = Editor.string(editor, range)

      const codeBlockMatch = beforeText.match(/^`{3}([a-z+-]*)/)
      if (codeBlockMatch) {
        const [,lang] = codeBlockMatch
        Transforms.select(editor, range)
        Transforms.delete(editor)
        Transforms.setNodes(editor, {
          type: 'code-block',
          lang,
          focus: true,
          theme: codeTheme(config),
        }, {
          match: n => Editor.isBlock(editor, n),
        })

        return
      }

      const codeMatch = beforeText.match(/`(.+?)`/)
      if (codeMatch) {
        const [match, code] = codeMatch
        const startIndex = anchor.offset - match.length
        Transforms.select(editor, {
          anchor,
          focus: {...anchor, offset: startIndex}
        })
        Transforms.delete(editor)
        Transforms.insertNodes(editor, {
          type: 'code',
          children: [{text: code}]
        })
        return
      }

      const linkMatch = beforeText.match(/\[(.+?)\]\((.+?)\)/)
      if (linkMatch) {
        const [match, title, url] = linkMatch
        const startIndex = anchor.offset - match.length
        Transforms.select(editor, {
          anchor,
          focus: {...anchor, offset: startIndex}
        })
        Transforms.delete(editor)
        Transforms.insertNodes(editor, {
          type: 'link',
          url,
          children: [{text: title}]
        })

        return
      }

      const type = SHORTCUTS[beforeText]

      if (type) {
        Transforms.select(editor, range)
        Transforms.delete(editor)
        Transforms.setNodes(editor, {type}, {
          match: n => Editor.isBlock(editor, n)
        })

        if (type === 'list-item') {
          const list = {type: 'bulleted-list', children: []}
          Transforms.wrapNodes(editor, list, {
            match: n => n.type === 'list-item',
          })
        }

        return
      }
    }

    insertText(text)
  }

  editor.deleteBackward = (...args) => {
    const {selection} = editor

    if (selection && Range.isCollapsed(selection)) {
      const above = Editor.above(editor, {
        match: n => Editor.isBlock(editor, n),
      })

      if (above) {
        const [block, path] = above
        const start = Editor.start(editor, path)
        const prev = Editor.previous(editor, {at: path})
        const isStart = Point.equals(selection.anchor, start)

        if (isStart && block.type !== 'paragraph') {
          Transforms.setNodes(editor, {type: 'paragraph'})
          if (block.type === 'list-item') {
            Transforms.unwrapNodes(editor, {
              match: n => n.type === 'bulleted-list',
            })
          }

          return
        }

        if (isStart && prev && prev[0].type === 'code-block') {
          const content = Editor.string(editor, path)
          Transforms.move(editor, {unit: 'line', reverse: true, edge: 'end'})
          Transforms.removeNodes(editor, {at: path})
          const node = ReactEditor.toDOMNode(editor, prev[0])
          const cm = (node.querySelector('.CodeMirror') as any)?.CodeMirror
          if (cm) {
            cm.replaceRange(content, {line: Infinity})
            cm.setCursor(Infinity, Infinity)
            setTimeout(() => {
              cm.focus()
              const cur = cm.getCursor()
              cm.setCursor(cur.line, cur.ch-content.length)
            }, 0)
          }
          return
        }
      }

      deleteBackward(...args)
    }
  }

  editor.insertData = (data) => {
    const text = data.getData('text/plain')
    const {files} = data

    if (files && files.length > 0) {
      for (const file of files) {
        const reader = new FileReader()
        const [mime] = file.type.split('/')

        if (mime === 'image') {
          reader.addEventListener('load', () => {
            const url = reader.result
            insertImage(editor, url)
          })

          reader.readAsDataURL(file)
        }
      }
    } else if (isImage(text)) {
      insertImage(editor, text)
    } else {
      insertData(data)
    }
  }

  return editor
}

const insertImage = (editor, url) => {
  const image = {type: 'image', url, children: [{text: ' '}]}
  Transforms.insertNodes(editor, image)
}

const Element = ({ attributes, children, element }) => {
  switch (element.type) {
    case 'block-quote':
      return <blockquote {...attributes}>{children}</blockquote>
    case 'bulleted-list':
      return <ul {...attributes}>{children}</ul>
    case 'heading-one':
      return <h1 {...attributes}>{children}</h1>
    case 'heading-two':
      return <h2 {...attributes}>{children}</h2>
    case 'heading-three':
      return <h3 {...attributes}>{children}</h3>
    case 'heading-four':
      return <h4 {...attributes}>{children}</h4>
    case 'heading-five':
      return <h5 {...attributes}>{children}</h5>
    case 'heading-six':
      return <h6 {...attributes}>{children}</h6>
    case 'list-item':
      return <li {...attributes}>{children}</li>
    case 'image':
      return <Image attributes={attributes} element={element}>{children}</Image>
    case 'link':
      return <Link attributes={attributes} element={element}>{children}</Link>
    case 'code':
      return <code {...attributes}>{children}</code>
    case 'code-block':
      return (
        <CodeEditor
          attributes={attributes}
          element={element}>
          {children}
        </CodeEditor>
      )
    default:
      return <p {...attributes}>{children}</p>
  }
}

export default (props: Props) => {
  const dispatch = useDispatch()
  const containerRef = useRef(null)
  const loadingPrev = usePrevious(props.loading)

  const renderElement = useCallback(props => <Element {...props} />, [])
  const editor = useMemo(() => {
    return withCustoms(props.config, withReact(withHistory(createEditor())))
  }, [])

  const OnChange = (value: any) => {
    const lastModified = loadingPrev === false ? new Date : props.lastModified
    dispatch(UpdateText(value, lastModified))
  }

  const OnKeyUp = (event) => {
    const sel = window.getSelection()
    if (!sel.isCollapsed) return

    const nodeEntry = Editor.above(editor, {
      match: n => Editor.isBlock(editor, n),
    })

    if (!nodeEntry) return
    const height = containerRef.current.offsetHeight
    const node = !Editor.isVoid(editor, nodeEntry[0]) ?
      ReactEditor.toDOMNode(editor, nodeEntry[0]) :
      sel.anchorNode.nodeType === Node.ELEMENT_NODE ?
      sel.anchorNode :
      sel.anchorNode.parentNode
    const rect = (node as Element).getBoundingClientRect()
    const top = rect.top+containerRef.current.scrollTop
    containerRef.current.scrollTo({top: top-(height/2.5), behavior: 'smooth'})
  }

  const OnKeyDown = (event) => {
    if (!editor.selection) return
    const {anchor} = editor.selection

    const next = Editor.next(editor, editor.selection)
    const nodeEntry = Editor.above(editor, {
      match: n => Editor.isBlock(editor, n),
    })

    if (!next && event.key === 'ArrowDown' && nodeEntry && Editor.isVoid(editor, nodeEntry[0])) {
      Transforms.insertNodes(editor, {children: [{text: ''}]}, {
        at: [anchor.path[0]+1],
      })
    }
  }

  useLayoutEffect(() => {
    if (props.loading) return
    return () => {
      Transforms.select(editor, {path: [0], offset: 0})
    }
  }, [props.files])

  useEffect(() => {
    if (props.loading) return
    props.text.forEach((node, i) => {
      Transforms.setNodes(editor, {theme: codeTheme(props.config)}, {
        match: (n) => n.type === 'code-block',
        at: [i],
      })
    })
  }, [props.config])

  const OnCopy = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const above = Editor.above(editor, {
      match: n => Editor.isBlock(editor, n),
    })

    if (!above) return
    const [node, path] = above;

    if (node.type === 'code-block') {
      event.preventDefault()
    } else if (node.type === 'image') {
      Transforms.select(editor, path)
    }
  }

  if (props.loading) {
    return null
  }

  return (
    <Container ref={containerRef}>
      <Slate
        editor={editor}
        value={props.text}
        onChange={OnChange}>
        <Editable
          renderElement={renderElement}
          placeholder="Start typing ..."
          onKeyDown={OnKeyDown}
          onKeyUp={OnKeyUp}
          onCopy={OnCopy}
          onCut={OnCopy}
          spellCheck
          autoFocus
        />
      </Slate>
    </Container>
  )
}
