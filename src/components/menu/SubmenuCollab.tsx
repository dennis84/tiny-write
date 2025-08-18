import {useSearchParams} from '@solidjs/router'
import {createEffect, createSignal, onCleanup, Show} from 'solid-js'
import {WEB_URL} from '@/env'
import {copy} from '@/remote/clipboard'
import {useState} from '@/state'
import {IconCloud, IconCloudOff, IconGroup, IconLink} from '../Icon'
import {Label, Link, Sub, Text} from './Style'

export const SubmenuCollab = () => {
  const {store, collabService} = useState()
  const [collabUsers, setCollabUsers] = createSignal(0)
  const [lastAction, setLastAction] = createSignal<string | undefined>()
  const [, setSearchParams] = useSearchParams()

  const onCollabStart = () => {
    collabService.startCollab()
    setSearchParams({share: 'true'})
  }

  const onCollabStop = () => {
    collabService.stopCollab()
    setSearchParams({share: undefined})
  }

  const onCopyCollabLink = async () => {
    await copy(`${WEB_URL}/${collabService.provider?.roomname}?share=true`)
    setLastAction('copy-collab-link')
  }

  createEffect(() => {
    const provider = store.collab?.provider
    if (!provider) return
    const fn = () => setCollabUsers(provider.awareness.states.size)
    provider.awareness.on('update', fn)
    onCleanup(() => {
      setCollabUsers(0)
      provider?.awareness.off('update', fn)
    })
  })

  createEffect(() => {
    if (!lastAction()) return
    const id = setTimeout(() => {
      setLastAction(undefined)
    }, 1000)
    onCleanup(() => clearTimeout(id))
  })

  return (
    <>
      <Label>Collab</Label>
      <Sub data-tauri-drag-region="true">
        <Show when={store.collab?.error}>⚠️ Connection error, reconnecting ...</Show>
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
            <IconLink /> Copy Link {lastAction() === 'copy-collab-link' && '📋'}
          </Link>
          <Text>
            <IconGroup /> {collabUsers()} {collabUsers() === 1 ? 'user' : 'users'} connected
          </Text>
        </Show>
      </Sub>
    </>
  )
}
