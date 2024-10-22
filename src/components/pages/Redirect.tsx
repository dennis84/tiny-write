import {onMount} from 'solid-js'
import {useLocation} from '@solidjs/router'
import {LocationState, Mode, useState} from '@/state'
import {getMimeType, info} from '@/remote'
import {useOpen} from '@/open'

export const Redirect = () => {
  const {store, canvasService, fileService, editorService} = useState()
  const {open, openDir} = useOpen()
  const location = useLocation<LocationState>()

  onMount(async () => {
    const path = location.state?.file ?? store.args?.file
    const newFile = location.state?.newFile ?? store.args?.newFile
    const argPath = newFile ?? path

    if (store.args?.source && !argPath) {
      openDir()
      return
    }

    if (argPath) {
      let file = await fileService.findFileByPath(argPath)

      if (!file) {
        const mime = await getMimeType(argPath)
        const code = !mime.startsWith('text/markdown')
        file = await editorService.newFile({newFile, path, code})
        info(
          `Created new file with path (id=${file.id}, code=${code}, path=${path}, newFile=${newFile}, mime=${mime})`,
        )
      }

      return open(file)
    }

    if (store.mode === Mode.Editor && fileService.currentFile) {
      return open(fileService.currentFile)
    }

    if (store.mode === Mode.Code && fileService.currentFile) {
      return open(fileService.currentFile)
    }

    if (store.mode === Mode.Canvas && canvasService.currentCanvas) {
      return open(canvasService.currentCanvas)
    }

    const first = store.files.find((f) => !f.deleted)
    if (first) {
      return open(first)
    }

    const file = await editorService.newFile()
    info(`Created new file (id=${file.id})`)
    open(file)
  })

  return <></>
}
