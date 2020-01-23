import {h} from 'hyperapp'
import {Notification} from '..'
import {Clean} from '../actions'
import {Modal, ModalBody, ModalHeader, ModalFooter} from './Modal'
import {freestyle, buttonPrimary} from '../styles'

interface Props {
  notification: Notification;
}

const code = freestyle.registerStyle({
  'white-space': 'pre-wrap',
  'word-wrap': 'break-word',
  'background': '#fafafa',
  'border': '1px solid #ccc',
  'border-radius': '2px',
  'padding': '10px',
});

export default (props: Props) => (
  <Modal>
    <ModalHeader>{props.notification.title}</ModalHeader>
    <ModalBody>
      <p>
        There is an error with the editor state. This is probably due to an
        old version. To fix this, you can copy important notes from below,
        clean the state and paste it again.
      </p>
      <pre class={code}>
        <code>{JSON.stringify(props.notification.props)}</code>
      </pre>
    </ModalBody>
    <ModalFooter>
      <button class={buttonPrimary} onclick={Clean}>Clean</button>
    </ModalFooter>
  </Modal>
)
