import {createEffect, createSignal, onCleanup, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {isTest} from '@/env'
import {copy} from '@/remote/clipboard'
import type {CopilotSignIn} from '@/remote/copilot'
import {useState} from '@/state'
import {IconButton} from '../Button'
import {IconCopy, IconOpenInNew, IconToggleOff, IconToggleOn} from '../icons/Ui'
import {Link} from './Link'
import {Label, Note, Sub, Text} from './Style'

const UserCode = styled.code`
  margin-left: 10px;
  background: var(--background-90);
  padding: 0 5px;
  border-radius: var(--border-radius);
`

const POLL_INTERVAL = isTest ? 10 : 6_000

export const AiSubmenuGithub = () => {
  const {store, copilotService, dialogService} = useState()
  const [codeResult, setCodeResult] = createSignal<CopilotSignIn>()
  const [done, setDone] = createSignal(false)

  const onDisconnect = async () => {
    await copilotService.disconnect()
    setCodeResult(undefined)
  }

  const onConnect = async () => {
    const result = await copilotService.signIn()
    setCodeResult(result)
  }

  const onCopy = async () => {
    const value = codeResult()?.userCode
    if (!value) return
    await copy(value)
    dialogService.toast({message: 'User code copied to clipboard', duration: 2000})
  }

  const onVerify = async () => {
    const url = codeResult()?.verificationUri
    if (!url) return
    copilotService.verify(url)
  }

  createEffect(() => {
    const code = codeResult()
    if (!code) return

    const interval = setInterval(async () => {
      const status = await copilotService.getStatus(code)
      if (status?.user) {
        await copilotService.updateStatus(status)
        setCodeResult(undefined)
        setDone(true)
      }
    }, POLL_INTERVAL)

    onCleanup(() => {
      clearInterval(interval)
    })
  })

  return (
    <>
      <Label>GitHub Copilot</Label>
      <Sub data-tauri-drag-region="true">
        <Show when={!store.ai?.copilot?.user}>
          <Link onClick={onConnect} data-testid="connect">
            <IconToggleOn /> Connect to GitHub
          </Link>
        </Show>
        <Show when={codeResult()?.userCode}>
          <Note>
            Open the verification URL and enter the User Code. Leave this menu open until your user
            is displayed.
          </Note>
          <Text>
            User Code: <UserCode>{codeResult()?.userCode}</UserCode>
            <IconButton onClick={onCopy} data-testid="copy_verification_uri">
              <IconCopy />
            </IconButton>
          </Text>
          <Link onClick={onVerify}>
            <IconOpenInNew /> Open GitHub Verification URL
          </Link>
        </Show>
        <Show when={!codeResult()}>
          <Show when={store.ai?.copilot?.user}>
            {(name) => (
              <>
                <Text>Signed in with: {name()}</Text>
                <Link onClick={onDisconnect}>
                  <IconToggleOff /> Disconnect
                </Link>
                <Show when={done()}>
                  <Note>GitHub Copilot is now ready!</Note>
                </Show>
              </>
            )}
          </Show>
        </Show>
      </Sub>
    </>
  )
}
