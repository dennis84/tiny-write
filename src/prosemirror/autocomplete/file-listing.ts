import {PluginKey} from 'prosemirror-state'
import {isTauri} from '@/env'
import {dirname, listContents, resolvePath} from '@/remote'
import {ProseMirrorExtension} from '@/prosemirror'
import {Ctrl} from '@/services'
import {Mode} from '@/state'
import {completionKeymap, completionPlugin} from './autocomplete'

const pluginKey = new PluginKey('file-listing')

export default (ctrl: Ctrl): ProseMirrorExtension => isTauri() ? ({
  plugins: (prev) => [
    completionKeymap(pluginKey),
    ...prev,
    completionPlugin(
      pluginKey,
      /(\.\.?|~)\/[^\s\]]*/g,
      async (text) => {
        let currentFile
        if (ctrl.app.mode === Mode.Canvas) {
          const id = ctrl.canvas.activeEditorElement?.id
          if (id) currentFile = ctrl.file.findFileById(id)
        } else {
          currentFile = ctrl.file.currentFile
        }
        const filePath = currentFile?.newFile ?? currentFile?.path
        const basePath = filePath ? await dirname(filePath) : undefined

        return listContents(text, basePath)
      },
      ctrl
    ),
  ]
}) : ({})
