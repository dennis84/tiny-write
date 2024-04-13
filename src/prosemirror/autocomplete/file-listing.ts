import {PluginKey} from 'prosemirror-state'
import {isTauri} from '@/env'
import {listContents} from '@/remote'
import {ProseMirrorExtension} from '@/prosemirror'
import {Ctrl} from '@/services'
import {completionKeymap, completionPlugin} from './autocomplete'

const pluginKey = new PluginKey('file-listing')

export default (ctrl: Ctrl): ProseMirrorExtension => isTauri() ? ({
  plugins: (prev) => [
    completionKeymap(pluginKey),
    ...prev,
    completionPlugin(
      pluginKey,
      /(\.\.?|~)\/[^\s\])]*/g,
      async (text) => {
        const basePath = await ctrl.app.getBasePath()
        return listContents(text, basePath)
      },
      ctrl
    ),
  ]
}) : ({})
