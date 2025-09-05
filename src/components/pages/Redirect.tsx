import {useLocation} from '@solidjs/router'
import {onMount} from 'solid-js'
import {useOpen} from '@/hooks/open'
import {info} from '@/remote/log'
import {type LocationState, useState} from '@/state'

export const Redirect = () => {
  const {store, fileService} = useState()
  const {open, openFile, openDir} = useOpen()
  const location = useLocation<LocationState>()

  onMount(async () => {
    const lastLocation = store.location
    const path = store.args?.file
    const newFile = store.args?.newFile
    const argPath = newFile ?? path
    const selection = location.state?.selection

    if (store.args?.source && !argPath) {
      info(`Redirect dir`)
      openDir()
      return
    }

    if (argPath) {
      info(`Redirect to new file by path (path=${path})`)
      const file = await fileService.newFileByPath(path, newFile)
      return openFile(file, {selection})
    }

    if (lastLocation) {
      info(`Redirect to last location (lastLocation=${JSON.stringify(lastLocation)})`)
      return open(lastLocation)
    }

    const first = store.files.find((f) => !f.deleted)
    if (first) {
      info(`Redirect first file (id=${first?.id})`)
      return openFile(first, {selection})
    }

    const file = await fileService.newFile()
    info(`Redirect to new empty file (id=${file.id})`)
    openFile(file, {selection})
  })

  return null
}
