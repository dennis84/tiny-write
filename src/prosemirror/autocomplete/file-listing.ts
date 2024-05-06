import {PluginKey} from 'prosemirror-state'
import {listContents} from '@/remote'
import {Ctrl} from '@/services'
import {completionKeymap, completionPlugin} from './autocomplete'

const pluginKey = new PluginKey('file-listing')

export const plugins = (ctrl: Ctrl) => [
  completionKeymap(pluginKey),
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
