import {onMount} from 'solid-js'
import {useLocation} from '@solidjs/router'
import {type LocationState, useState} from '@/state'
import {info} from '@/remote/log'
import {useOpen} from '@/hooks/open'

export const Redirect = () => {
  const {store, fileService} = useState()
  const {open, openUrl, openDir} = useOpen()
  const location = useLocation<LocationState>()

  onMount(async () => {
    const lastLocation = store.lastLocation
    info(`Redirect to (path=${lastLocation?.path})`)

    const path = location.state?.file ?? store.args?.file
    const newFile = location.state?.newFile ?? store.args?.newFile
    const argPath = newFile ?? path
    const back = !!location.state?.prev
    const selection = location.state?.selection

    if (store.args?.source && !argPath) {
      openDir()
      return
    }

    if (argPath) {
      const file = await fileService.newFileByPath(path, newFile)
      return open(file, {back, selection})
    }

    if (lastLocation) {
      return openUrl(lastLocation.path)
    }

    const first = store.files.find((f) => !f.deleted)
    if (first) {
      return open(first, {back, selection})
    }

    const file = await fileService.newFile()
    info(`Created new file (id=${file.id})`)
    open(file, {back, selection})
  })

  return <></>
}
