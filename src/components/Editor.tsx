import React, {useLayoutEffect, useCallback, useMemo} from 'react'
import {Slate, Editable, withReact} from 'slate-react'
import {Editor, Node, Point, Range, Transforms, createEditor} from 'slate'
import {withHistory} from 'slate-history'
import {Config, File} from '..'
import {freestyle, rgb, rgba} from '../styles'
import {background, color, color2, font} from '../config'
import {OnTextChange, useDispatch} from '../reducer'
import CodeEditor from './CodeEditor'

const container = (config: Config) => freestyle.registerStyle({
  'width': '100%',
  'height': '100%',
  'min-height': 'calc(100vh - 50px)',
  'max-height': 'calc(100vh - 50px)',
  'overflow-y': 'auto',
  'padding': '0 50px',
  'display': 'flex',
  'justify-content': 'center',
  '&:before': {
    'content': '""',
    'height': '50px',
    'width': '100%',
    'background': `linear-gradient(to bottom, ${rgba(background(config), 1)}, ${rgba(background(config), 0)})`,
    'position': 'fixed',
    'z-index': '1',
    'pointer-events': 'none',
  },
  '&:after': {
    'content': '""',
    'height': '20px',
    'width': '100%',
    'background': `linear-gradient(to top, ${rgba(background(config), 1)}, ${rgba(background(config), 0)})`,
    'position': 'fixed',
    'z-index': '1',
    'bottom': '50px',
    'pointer-events': 'none',
  },
  '> [contenteditable]': {
    'min-height': 'calc(100% - 100px)',
    'max-height': '100%',
    'width': '100%',
    'max-width': '800px',
    'font-size': '24px',
    'font-family': font(config),
    'color': rgb(color(config)),
    'margin-top': '50px',
    'padding-bottom': '100px',
    'line-height': '160%',
    'outline': 'none',
    'background': 'transparent',
    '-webkit-app-region': 'no-drag',
    '&::-webkit-scrollbar': {
      'display': 'none',
    },
    'p': {
      'margin': '0',
    },
    'blockquote': {
      'border-left': `10px solid ${rgba(color(config), 0.2)}`,
      'margin': '0',
      'padding-left': '20px',
    },
    'code': {
      'border': `1px solid ${rgba(color(config), 0.5)}`,
      'background': rgba(color(config), 0.1),
      'border-radius': '2px',
      'padding': '2px',
    },
    'a': {
      'color': rgba(color2(config), 1),
    }
  }
})

interface Props {
  text: Node[];
  files: File[];
  lastModified: Date,
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

const withEmbeds = editor => {
  const {isVoid} = editor
  editor.isVoid = (element) =>
    element.type === 'code-block' ? true : isVoid(element)

  return editor
}

const withShortcuts = (editor) => {
  const {deleteBackward, insertText} = editor

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
        Transforms.setNodes(editor, {type: 'code-block', lang, focus: true}, {
          match: n => Editor.isBlock(editor, n)
        })

        return
      }

      const codeMatch = beforeText.match(/`(.+?)`/)
      if (codeMatch) {
        const [,code] = codeMatch
        const startIndex = anchor.offset - code.length
        Transforms.delete(editor, {at: {...anchor, offset: startIndex - 2}})
        Transforms.delete(editor, {reverse: true})
        Transforms.select(editor, {
          anchor: {...anchor, offset: anchor.offset-2},
          focus: {...anchor, offset: startIndex-2}
        })

        Editor.addMark(editor, 'code', true)
        Transforms.collapse(editor)
        Transforms.insertNodes(editor, [{text: ' '}])
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

  return editor
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
    case 'code':
      return <code {...attributes}>{children}</code>
    case 'code-block':
      return (
        <CodeEditor attributes={attributes} children={children} element={element} />
      )
    default:
      return <p {...attributes}>{children}</p>
  }
}

const Leaf = ({attributes, children, leaf}) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>
  }

  if (leaf.code) {
    children = <code>{children}</code>
  }

  if (leaf.italic) {
    children = <em>{children}</em>
  }

  if (leaf.underline) {
    children = <u>{children}</u>
  }

  return <span {...attributes}>{children}</span>
}

export default (props: Props) => {
  const dispatch = useDispatch()

  const renderElement = useCallback(props => <Element {...props} />, [])
  const renderLeaf = useCallback(props => <Leaf {...props} />, [])
  const editor = useMemo(() => {
    return withEmbeds(withShortcuts(withReact(withHistory(createEditor()))))
  }, [])

  const OnChange = (value: any) => {
    dispatch(OnTextChange(value))
  }

  const OnKeyDown = (event) => {
    const {anchor} = editor.selection
    const [node] = Editor.node(editor, editor.selection)
    const isEnd = anchor && Editor.isEnd(editor, anchor, [anchor.path[0]])

    if (event.key === 'ArrowRight' && isEnd && (node.type === 'code' || node.code)) {
      event.preventDefault()
      Transforms.insertNodes(editor, {text: ' '})
    }
  }

  useLayoutEffect(() => {
    return () => {
      Transforms.select(editor, {path: [0], offset: 0})
    }
  }, [props.files])

  return (
    <div className={container(props.config)}>
      <Slate
        children={0}
        editor={editor}
        value={props.text}
        onChange={OnChange}>
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder="Start typing ..."
          onKeyDown={OnKeyDown}
          spellCheck
          autoFocus
        />
      </Slate>
    </div>
  )
}
