import {Show} from 'solid-js'
import {useCollabCount} from '@/hooks/use-collab-count'
import {copy} from '@/remote/clipboard'
import {useState} from '@/state'
import {IconCloud, IconCloudOff, IconGroup, IconLink} from '../Icon'
import {Link} from './Link'
import {Label, Sub, Text} from './Style'

export const SubmenuCollab = () => {
  const {store, collabService, toastService} = useState()
  const collabUsers = useCollabCount()

  const onCollabStart = () => {
    collabService.connect()
  }

  const onCollabStop = () => {
    collabService.disconnect()
  }

  const onCopyCollabLink = async () => {
    const joinUrl = collabService.getJoinUrl()
    if (joinUrl) {
      await copy(joinUrl)
      toastService.open({message: 'Collab link copied to clipboard', duration: 2000})
    }
  }

  return (
    <>
      <Label>Collab</Label>
      <Sub data-tauri-drag-region="true">
        <Show when={store.collab?.error}>! Connection error, reconnecting ...</Show>
        <Show when={!store.collab?.started}>
          <Link onClick={onCollabStart} data-testid="collab">
            <IconCloud /> Share
          </Link>
        </Show>
        <Show when={store.collab?.started}>
          <Link onClick={onCollabStop} data-testid="collab">
            <IconCloudOff /> Disconnect
          </Link>
          <Link onClick={onCopyCollabLink}>
            <IconLink /> Copy Link
          </Link>
          <Text>
            <IconGroup /> {collabUsers()} {collabUsers() === 1 ? 'user' : 'users'} connected
          </Text>
        </Show>
      </Sub>
    </>
  )
}
