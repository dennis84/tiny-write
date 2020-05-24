import React, {useEffect, useLayoutEffect, useCallback, useRef, useMemo} from 'react'
import {Slate, Editable, withReact} from 'slate-react'
import {Editor, Node, Point, Range, Transforms, createEditor} from 'slate'
import {withHistory} from 'slate-history'
import styled from '@emotion/styled'
import isImage from 'is-image'
import {Config, File} from '..'
import {rgb, rgba} from '../styles'
import {background, color, color2, codeTheme, font} from '../config'
import {UpdateText, useDispatch} from '../reducer'
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
  &:before {
    content: "";
    height: 50px;
    width: 100%;
    background: linear-gradient(to bottom, ${props => rgba(background(props.theme), 1)}, ${props => rgba(background(props.theme), 0)});
    position: fixed;
    z-index: 1;
    pointer-events: none;
  }
  &:after {
    content: "";
    height: 20px;
    width: 100%;
    background: linear-gradient(to top, ${props => rgba(background(props.theme), 1)}, ${props => rgba(background(props.theme), 0)});
    position: fixed;
    z-index: 1;
    bottom: 50px;
    pointer-events: none;
  }
  > [contenteditable] {
    min-height: calc(100% - 100px);
    height: fit-content;
    width: 100%;
    max-width: 800px;
    font-size: 24px;
    font-family: ${props => font(props.theme)};
    color: ${props => rgb(color(props.theme))};
    margin-top: 50px;
    padding-bottom: 200px;
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
  text: Node[];
  files: File[];
  lastModified: Date;
  config: Config;
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
      const match = Editor.above(editor, {
        match: n => Editor.isBlock(editor, n),
      })

      if (match) {
        const [block, path] = match
        const start = Editor.start(editor, path)

        if (
          block.type !== 'paragraph' &&
          Point.equals(selection.anchor, start)
        ) {
          Transforms.setNodes(editor, {type: 'paragraph'})

          if (block.type === 'list-item') {
            Transforms.unwrapNodes(editor, {
              match: n => n.type === 'bulleted-list',
            })
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
      return <CodeEditor attributes={attributes} element={element}>{children}</CodeEditor>
    default:
      return <p {...attributes}>{children}</p>
  }
}

export default (props: Props) => {
  const dispatch = useDispatch()
  const containerRef = useRef(null)

  const renderElement = useCallback(props => <Element {...props} />, [])
  const editor = useMemo(() => {
    return withCustoms(props.config, withReact(withHistory(createEditor())))
  }, [])

  const OnChange = (value: any) => {
    dispatch(UpdateText(value))
  }

  const OnKeyDown = (event) => {
    if (!editor.selection) return
    const {anchor} = editor.selection
    const next = Editor.next(editor, editor.selection)
    const isEnd = anchor && Editor.isEnd(editor, anchor, [anchor.path[0]])
    const nodeEntry = Editor.above(editor, {
      match: n => Editor.isBlock(editor, n),
    })

    if (!next && event.key === 'ArrowDown' && nodeEntry?.[0].type === 'image') {
      Transforms.insertNodes(editor, {children: [{text: ''}]}, {
        at: [anchor.path[0]+1],
      })
    }

    if (!next && isEnd && event.key.length === 1) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }

  useLayoutEffect(() => {
    return () => {
      Transforms.select(editor, {path: [0], offset: 0})
    }
  }, [props.files])

  useEffect(() => {
    props.text.forEach((node, i) => {
      Transforms.setNodes(editor, {theme: codeTheme(props.config)}, {
        match: (n) => n.type === 'code-block',
        at: [i],
      })
    })
  }, [props.config])

  const OnCopy = (e) => {
    const [node, path] = Editor.above(editor, {
      match: n => Editor.isBlock(editor, n),
    })

    if (node.type === 'code-block') {
      event.preventDefault()
    } else if (node.type === 'image') {
      Transforms.select(editor, path)
    }
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
          onCopy={OnCopy}
          onCut={OnCopy}
          spellCheck
          autoFocus
        />
      </Slate>
    </Container>
  )
}
