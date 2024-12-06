import {createEffect, createSignal, onCleanup, Show} from 'solid-js'
import {useState} from '@/state'
import {copilotSignIn as signIn, copilotStatus, open} from '@/remote'
import {Label, Link, Sub, Text} from './Style'
import {Icon} from '../Icon'

export const AiSubmenuGithub = () => {
  const {store, copilotService} = useState()
  const [userCode, setUserCode] = createSignal<string>()

  const onDisable = async () => {
    await copilotService.disable()
    setUserCode(undefined)
  }

  const onConnect = async () => {
    await copilotService.enable()
    const result = await signIn() as any

    if (result.userCode) {
      setUserCode(result.userCode)
      await open(result.verificationUri)
    }
  }

  createEffect(() => {
    if (!userCode()) return

    const interval = setInterval(async () => {
      const status = await copilotStatus() as any
      if (status.user) {
        copilotService.setUser(status.user)
        setUserCode(undefined)
      }
    }, 1000)

    onCleanup(() => {
      clearInterval(interval)
    })
  })

  return (
    <>
      <Label>GitHub Copilot</Label>
      <Sub data-tauri-drag-region="true">
        <Show when={store.ai?.copilot?.user}>
          {(name) => <Text>Signed in with: {name()}</Text>}
        </Show>
        <Show when={store.ai?.copilot?.enabled}>
          <Link onClick={onDisable}>
            <Icon>toggle_off</Icon> Disconnect
          </Link>
        </Show>
        <Show when={!store.ai?.copilot?.enabled}>
          <Link onClick={onConnect}>
            <Icon>toggle_on</Icon> Connect to GitHub
          </Link>
        </Show>
        <Show when={userCode()}>
          <Text>User Code: {userCode()}</Text>
          <Text>Waiting for sign up ...</Text>
        </Show>
      </Sub>
    </>
  )
}
