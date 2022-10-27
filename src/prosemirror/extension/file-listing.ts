import {isTauri} from '../../env'
import {listContents} from '../../remote'
import {ProseMirrorExtension} from '../state'
import {completionKeymap, completionPlugin} from './autocomplete'

const REGEX = /[.~]\/[^\s]*/g

export default (): ProseMirrorExtension => isTauri ? ({
  plugins: (prev) => [
    completionKeymap,
    ...prev,
    completionPlugin(REGEX, async (text) => {
      return listContents(text)
    }),
  ]
}) : ({})
