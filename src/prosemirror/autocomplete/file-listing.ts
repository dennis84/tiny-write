import {PluginKey} from 'prosemirror-state'
import {listContents} from '@/remote/editor'
import {AppService} from '@/services/AppService'
import {completionKeymap, completionPlugin} from './autocomplete'

export const fileListingPluginKey = new PluginKey('file-listing')

export const fileListingKeymap = completionKeymap(fileListingPluginKey)

export const createFileListingPlugin = (appService: AppService) =>
  completionPlugin(fileListingPluginKey, /(\.\.?|~)\/[^\s\])]*/g, async (text) => {
    const basePath = await appService.getBasePath()
    return listContents(text, basePath)
  })
