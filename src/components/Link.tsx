import React, {useState} from 'react'
import {createPortal} from 'react-dom'
import {Transforms} from 'slate'
import {ReactEditor, useEditor} from 'slate-react'
import {freestyle, buttonPrimary} from '../styles'
import {Modal, ModalHeader, ModalBody, ModalFooter} from './Modal'

const input = freestyle.registerStyle({
  'position': 'relative',
  'input': {
    'font-family': 'Roboto',
    'width': '100%',
    'height': '48px',
    'background': '#fff',
    'border-radius': '2px',
    'color': '#4c4c4c',
    'padding-left': '8px',
    'padding-top': '16px',
    'font-size': '18px',
    'border': '0',
    'appearance': 'none',
    'box-shadow': '0 0 0 1px #8c8c8c',
    'outline': 'none',
  },
  'input::-ms-clear': {
    'display': 'none',
  },
  'input::placeholder': {
    'color': 'transparent',
  },
  'input:hover, input:focus': {
    'box-shadow': '0 0 0 2px #4c4c4c',
  },
  'input[disabled]': {
    'background': '#f6f6f6',
    'padding-top': '0',
    'pointer-events': 'none',
    'box-shadow': 'none',
    'border': '1px solid #ccc',
  },
  'input[disabled] ~ label': {
    'display': 'none',
  },
  'input ~ label': {
    'font-family': 'Roboto',
    'position': 'absolute',
    'padding-left': '8px',
    'font-size': '12px',
    'color': '#8c8c8c',
    'transition': 'all 0.2s ease-in-out',
    'line-height': '12px',
    'top': '8px',
    'left': '0',
    'z-index': '2',
  },
  'input[value=""] ~ label': {
    'line-height': '48px',
    'font-size': '16px',
    'pointer-events': 'none',
    'top': '0',
  },
  'input:focus ~ label': {
    'font-size': '12px',
    'line-height': '12px',
    'top': '8px',
  }
})

export default ({attributes, element, children}) => {
  const editor = useEditor()
  const [edit, setEdit] = useState(false)
  const [value, setValue] = useState(element.url)
  const container = ReactEditor.toDOMNode(editor, editor)

  const OnOpen = (e) => {
    e.preventDefault()
    ReactEditor.deselect(editor)
    setEdit(true)
  }

  const OnClose = (e) => {
    e.preventDefault()
    setEdit(false)
  }

  const OnChange = (e) => {
    setValue(e.target.value)
  }

  const OnSave = (e) => {
    const at = ReactEditor.findPath(editor, element)
    if (value === '') {
      Transforms.unwrapNodes(editor, {at})
    } else {
      Transforms.setNodes(editor, {url: value}, {at})
    }

    setEdit(false)
  }

  const EditLink = () => {
    return (
      <Modal onBackgroundClick={OnClose}>
        <ModalHeader>Edit Link</ModalHeader>
        <ModalBody>
          <p>Change link URL (Enter blank URL to remove the link)</p>
          <div className={input}>
            <input
              type="text"
              value={value}
              onChange={OnChange}
              autoFocus />
            <label>Link URL</label>
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            className={buttonPrimary}
            onClick={OnClose}>
            Close
          </button>
          <button
            className={buttonPrimary}
            onClick={OnSave}>
            Save
          </button>
        </ModalFooter>
      </Modal>
    )
  }

  return (
    <>
      {edit && createPortal(<EditLink />, container.parentNode)}
      <a {...attributes} href={element.url} onClick={OnOpen}>{children}</a>
    </>
  )
}
