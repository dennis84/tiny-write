import {Config, FileText, ServiceError} from '@/state'
import * as remote from '@/remote'
import {createExtensions, createSchema} from '@/prosemirror-setup'
import {createMarkdownParser} from '@/markdown'

export interface LoadedFile {
  text: FileText;
  lastModified: Date;
  path: string;
}

export class FilesystemService {
  async loadFile(config: Config, path: string): Promise<LoadedFile> {
    try {
      const resolvedPath = await remote.resolvePath([path])
      const fileContent = await remote.readFile(resolvedPath)
      const lastModified = await remote.getFileLastModified(resolvedPath)
      const extensions = createExtensions({
        config,
        markdown: false,
        path: resolvedPath,
        keymap: {},
      })
      const schema = createSchema(extensions)
      const parser = createMarkdownParser(schema)
      const doc = parser.parse(fileContent)?.toJSON()
      const text = {
        doc,
        selection: {
          type: 'text',
          anchor: 1,
          head: 1
        }
      }

      return {
        text,
        lastModified,
        path: resolvedPath,
      }
    } catch (e) {
      throw new ServiceError('file_permission_denied', {error: e})
    }
  }
}
