import {PluginKey} from 'prosemirror-state'
import {isTauri} from '@/env'
import {listContents} from '@/remote'
import {ProseMirrorExtension} from '@/prosemirror'
import {completionKeymap, completionPlugin} from './autocomplete'
import {Ctrl} from '@/services'

const pluginKey = new PluginKey('file-listing')

export default (ctrl: Ctrl): ProseMirrorExtension => isTauri ? ({
  plugins: (prev) => [
    completionKeymap(pluginKey),
    ...prev,
    completionPlugin(
      pluginKey,
      /(\.\.?|~)\/[^\s\]]*/g,
      async (text) => {
        console.log(text)
        return listContents(text)
      },
      ctrl
    ),
  ]
}) : ({})
