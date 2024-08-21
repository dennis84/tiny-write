import {PluginKey} from 'prosemirror-state'
import {listContents} from '@/remote'
import {Ctrl} from '@/services'
import {completionKeymap, completionPlugin} from './autocomplete'

export const fileListingPluginKey = new PluginKey('file-listing')

export const fileListingKeymap = completionKeymap(fileListingPluginKey)

export const createFileListingPlugin = (ctrl: Ctrl) => completionPlugin(
  fileListingPluginKey,
  /(\.\.?|~)\/[^\s\])]*/g,
  async (text) => {
    const basePath = await ctrl.app.getBasePath()
    return listContents(text, basePath)
  },
)
