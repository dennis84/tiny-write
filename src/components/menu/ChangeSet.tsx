import {For, Show, createSignal, onCleanup} from 'solid-js'
import {format} from 'date-fns'
import {Version, useState} from '@/state'
import {ButtonGroup, ButtonPrimary} from '@/components/Button'
import {DrawerContent} from '../Drawer'
import {Label, Link, Sub} from './Style'
import {MenuDrawer} from './Menu'
import {MenuNavbar} from './Navbar'

export const ChangeSet = () => {
  const {changeSetService, fileService} = useState()
  const versions = () => fileService.currentFile?.versions ?? []
  const [active, setActive] = createSignal<Version>()

  const renderVersion = (version: Version) => {
    if (active() != version) {
      setActive(version)
      changeSetService.renderVersion(version)
    } else {
      setActive(undefined)
      changeSetService.unrenderVersion()
    }
  }

  const applyVersion = () => {
    const version = active()
    if (!version) return
    changeSetService.applyVersion(version)
    setActive(undefined)
  }

  onCleanup(() => {
    const currentFile = fileService.currentFile
    changeSetService.unrenderVersion()
    currentFile?.editorView?.focus()
  })

  return (
    <MenuDrawer>
      <MenuNavbar />
      <DrawerContent>
        <Label>Change Set</Label>
        <Sub data-tauri-drag-region="true">
          <For each={versions()} fallback={<p>No snapshots yet</p>}>
            {(version) => (
              <Link onClick={() => renderVersion(version)}>
                {format(version.date, 'dd MMMM HH:mm:ss')}
                {version.date === active()?.date && ' ✅'}
              </Link>
            )}
          </For>
        </Sub>
        <ButtonGroup>
          <Show when={active() === undefined}>
            <ButtonPrimary onClick={() => changeSetService.addVersion()}>
              Create Snapshot
            </ButtonPrimary>
          </Show>
          <Show when={active() !== undefined}>
            <ButtonPrimary onClick={() => applyVersion()}>Apply Snapshot</ButtonPrimary>
          </Show>
        </ButtonGroup>
      </DrawerContent>
    </MenuDrawer>
  )
}
