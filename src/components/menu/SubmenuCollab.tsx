import {createEffect, createSignal, onCleanup, Show} from 'solid-js'
import {Mode, useState} from '@/state'
import * as remote from '@/remote'
import {Label, Link, Sub, Text} from './Menu'
import {WEB_URL} from '@/env'

export const SubmenuCollab = () => {
  const [store, ctrl] = useState()
  const [collabUsers, setCollabUsers] = createSignal(0)
  const [lastAction, setLastAction] = createSignal<string | undefined>()

  const onCollabStart = () => {
    ctrl.collab.startCollab()
  }

  const onCollabStop = () => {
    ctrl.collab.stopCollab()
  }

  const onCopyCollabLink = async () => {
    const m = store.mode === Mode.Canvas ? 'c/' : ''
    await remote.copy(`${WEB_URL}/${m + ctrl.collab.room}`)
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
        <Show when={store.collab?.error}>
          ⚠️ Connection error, reconnecting ...
        </Show>
        <Show when={!store.collab?.started}>
          <Link
            onClick={onCollabStart}
            data-testid="collab">
            Share 🌐
          </Link>
        </Show>
        <Show when={store.collab?.started}>
          <Link
            onClick={onCollabStop}
            data-testid="collab">
            Disconnect
          </Link>
          <Link onClick={onCopyCollabLink}>
            Copy Link 🔗 {lastAction() === 'copy-collab-link' && '📋'}
          </Link>
          <Text>
            {collabUsers()} {collabUsers() === 1 ? 'user' : 'users'} connected
          </Text>
        </Show>
      </Sub>
    </>
  )
}
