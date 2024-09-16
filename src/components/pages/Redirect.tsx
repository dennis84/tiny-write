import {onMount} from 'solid-js'
import {useNavigate} from '@solidjs/router'
import {Mode, useState} from '@/state'
import {getMimeType, info} from '@/remote'

export const Redirect = () => {
  const {store, canvasService, fileService, editorService} = useState()
  const navigate = useNavigate()

  const redirectTo = (to: string) => {
    info(`Redirect to (to=${to})`)
    navigate(to)
  }

  onMount(async () => {
    const argPath = store.args?.newFile ?? store.args?.file

    if (argPath) {
      let file = await fileService.findFileByPath(argPath)
      if (!file) {
        const mime = await getMimeType(argPath)
        const code = !mime.startsWith('text/markdown')
        const newFile = store.args?.newFile
        const path = store.args?.file
        file = await editorService.newFile({newFile, path, code})
        info(
          `Created new file with path (id=${file.id}, code=${code}, path=${path}, newFile=${newFile}, mime=${mime})`,
        )
      } else {
        info(`File exists delete DB does not worrk :(`)
      }

      redirectTo(`/${file.code ? 'code' : 'editor'}/${file.id}`)
    } else if (store.mode === Mode.Editor && fileService.currentFile) {
      redirectTo(`/${store.mode}/${fileService.currentFile?.id}`)
    } else if (store.mode === Mode.Code && fileService.currentFile) {
      redirectTo(`/${store.mode}/${fileService.currentFile?.id}`)
    } else if (store.mode === Mode.Canvas && canvasService.currentCanvas) {
      redirectTo(`/${store.mode}/${canvasService.currentCanvas?.id}`)
    } else {
      const file = await editorService.newFile()
      info(`Created new file (id=${file.id})`)
      redirectTo(`/editor/${file.id}`)
    }
  })

  return <></>
}
