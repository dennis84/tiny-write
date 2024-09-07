import {onMount} from 'solid-js'
import {useNavigate} from '@solidjs/router'
import {Mode, useState} from '@/state'
import {getMimeType, info} from '@/remote'

export const Redirect = () => {
  const [store, ctrl] = useState()
  const navigate = useNavigate()

  const redirectTo = (to: string) => {
    info(`Redirect to (to=${to})`)
    navigate(to)
  }

  onMount(async () => {
    const argPath = store.args?.newFile ?? store.args?.file

    if (argPath) {
      let file = await ctrl.file.findFileByPath(argPath)
      if (!file) {
        const mime = await getMimeType(argPath)
        const code = !mime.startsWith('text/')
        const newFile = store.args?.newFile
        const path = store.args?.file
        file = await ctrl.editor.newFile({newFile, path, code})
        info(`Created new file with path (id=${file.id}, code=${code}, path=${path}, newFile=${newFile})`)
      }

      redirectTo(`/${file.code ? 'code' : 'editor'}/${file.id}`)
    } else if (store.mode === Mode.Editor && ctrl.file.currentFile) {
      redirectTo(`/${store.mode}/${ctrl.file.currentFile?.id}`)
    } else if (store.mode === Mode.Code && ctrl.file.currentFile) {
      redirectTo(`/${store.mode}/${ctrl.file.currentFile?.id}`)
    } else if (store.mode === Mode.Canvas && ctrl.canvas.currentCanvas) {
      redirectTo(`/${store.mode}/${ctrl.canvas.currentCanvas?.id}`)
    } else {
      const file = await ctrl.editor.newFile()
      info(`Created new file (id=${file.id})`)
      redirectTo(`/editor/${file.id}`)
    }
  })

  return <></>
}
