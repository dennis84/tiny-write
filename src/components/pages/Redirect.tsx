import {onMount} from 'solid-js'
import {useNavigate} from '@solidjs/router'
import {isCodeFile, Mode, useState} from '@/state'
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

    if (store.args?.source && !argPath) {
      redirectTo('/dir')
      return
    }

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
      }

      return redirectTo(`/${file.code ? 'code' : 'editor'}/${file.id}`)
    }

    if (store.mode === Mode.Editor && fileService.currentFile) {
      return redirectTo(`/${store.mode}/${fileService.currentFile?.id}`)
    }

    if (store.mode === Mode.Code && fileService.currentFile) {
      return redirectTo(`/${store.mode}/${fileService.currentFile?.id}`)
    }

    if (store.mode === Mode.Canvas && canvasService.currentCanvas) {
      return redirectTo(`/${store.mode}/${canvasService.currentCanvas?.id}`)
    }

    const first = store.files.find((f) => !f.deleted)
    if (first) {
      return redirectTo(`/${isCodeFile(first) ? 'code' : 'editor'}/${first.id}`)
    }

    const file = await editorService.newFile()
    info(`Created new file (id=${file.id})`)
    redirectTo(`/editor/${file.id}`)
  })

  return <></>
}
