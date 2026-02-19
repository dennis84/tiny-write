import {format} from 'date-fns'
import {For, onCleanup, Show} from 'solid-js'
import {ButtonGroup, ButtonPrimary} from '@/components/Button'
import {useState} from '@/state'
import {DrawerContent} from '../Drawer'
import {Scroll} from '../Layout'
import {Link} from './Link'
import {MenuDrawer} from './Menu'
import {MenuNavbar} from './Navbar'
import {Label, Sub} from './Style'

export const ChangeSet = () => {
  const {locationService, changeSetService, fileService} = useState()
  const versions = () => fileService.currentFile?.versions ?? []

  const renderVersion = (snapshot: number) => {
    const currentFile = fileService.currentFile
    if (locationService.state?.snapshot === snapshot) {
      locationService.openItem(currentFile, {snapshot: undefined})
    } else {
      locationService.openItem(currentFile, {snapshot})
    }
  }

  const applyVersion = () => {
    const currentFile = fileService.currentFile
    const version = currentFile?.versions[locationService.state?.snapshot ?? -1]
    if (!version) return
    changeSetService.applyVersion(version)
    locationService.openItem(currentFile, {snapshot: undefined})
  }

  onCleanup(() => {
    const currentFile = fileService.currentFile
    locationService.openItem(currentFile, {snapshot: undefined})
    currentFile?.editorView?.focus()
  })

  return (
    <MenuDrawer>
      <MenuNavbar />
      <Scroll>
        <DrawerContent>
          <Label>Change Set</Label>
          <Sub data-tauri-drag-region="true">
            <For each={versions()} fallback={<p>No snapshots yet</p>}>
              {(version, i) => (
                <Link
                  onClick={() => renderVersion(i())}
                  checked={i() === locationService.state?.snapshot}
                >
                  {format(version.date, 'dd MMMM HH:mm:ss')}
                </Link>
              )}
            </For>
          </Sub>
          <ButtonGroup>
            <Show when={locationService.state?.snapshot === undefined}>
              <ButtonPrimary onClick={() => changeSetService.addVersion()}>
                Create Snapshot
              </ButtonPrimary>
            </Show>
            <Show when={locationService.state?.snapshot !== undefined}>
              <ButtonPrimary onClick={() => applyVersion()}>Apply Snapshot</ButtonPrimary>
            </Show>
          </ButtonGroup>
        </DrawerContent>
      </Scroll>
    </MenuDrawer>
  )
}
