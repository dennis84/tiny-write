import React from 'react'
import styled from '@emotion/styled'
import {Notification} from '..'
import {Clean, useDispatch} from '../reducer'
import {Modal, ModalBody, ModalHeader, ModalFooter} from './Modal'
import {ButtonPrimary} from './Button'

interface Props {
  notification: Notification;
}

const Pre = styled.pre`
  white-space: pre-wrap;
  word-wrap: break-word;
  background: #fafafa;
  border: 1px solid #ccc;
  border-radius: 2px;
  padding: 10px;
`

export default (props: Props) =>
  props.notification.id === 'invalid_state' ?
  invalidState('Invalid State', props.notification.props) :
  props.notification.id === 'invalid_config' ?
  invalidState('Invalid Config', props.notification.props) :
  props.notification.id === 'invalid_file' ?
  invalidState('Invalid File', props.notification.props) :
  null

const invalidState = (title, props) => {
  const dispatch = useDispatch()
  const onClick = () => dispatch(Clean)

  return (
    <Modal>
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        <p>
          There is an error with the editor state. This is probably due to an
          old version. To fix this, you can copy important notes from below,
          clean the state and paste it again.
        </p>
        <Pre>
          <code>{JSON.stringify(props)}</code>
        </Pre>
      </ModalBody>
      <ModalFooter>
        <ButtonPrimary onClick={onClick}>Clean</ButtonPrimary>
      </ModalFooter>
    </Modal>
  )
}
