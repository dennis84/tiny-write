import {PluginKey} from 'prosemirror-state'
import {isTauri} from '../../env'
import {listContents} from '../../remote'
import {ProseMirrorExtension} from '../state'
import {completionKeymap, completionPlugin} from './autocomplete'

const pluginKey = new PluginKey('file-listing')

export default (): ProseMirrorExtension => isTauri ? ({
  plugins: (prev) => [
    completionKeymap(pluginKey),
    ...prev,
    completionPlugin(
      pluginKey,
      /(\.\.?|~)\/[^\s]*/g,
      async (text) => listContents(text)
    ),
  ]
}) : ({})
