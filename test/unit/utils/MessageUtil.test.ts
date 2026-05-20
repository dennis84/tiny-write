import {expect, test} from 'vitest'
import {AttachmentType, type Message} from '@/types'
import {MessageUtil} from '@/utils/MessageUtil'

test('toChatMessage', () => {
  const message: Message = {
    id: '1',
    role: 'user',
    content: '123',
    attachments: [
      {type: AttachmentType.Text, content: 'Text'},
      {type: AttachmentType.File, content: 'File', codeLang: 'typescript'},
      {
        type: AttachmentType.Selection,
        content: 'Selection',
        codeLang: 'typescript',
        selection: [[0, 0]],
      },
      {type: AttachmentType.Image, content: '123', name: 'img'},
      {
        type: AttachmentType.Project,
        projectName: 'Project',
        projectId: '1',
        tree: 'TREE',
        files: [
          {type: AttachmentType.File, content: 'F1', codeLang: 'typescript'},
          {type: AttachmentType.File, content: 'F2', codeLang: 'typescript'},
          {type: AttachmentType.Text, content: 'README'},
        ],
      },
    ],
  }

  const result = MessageUtil.toChatMessage(message)
  expect.assert(result.content[0].type === 'text')
  expect(result.content[0].text).toEqual(`--- TEXT/MARKDOWN ATTACHMENT ---
type: Text or Markdown document
content:
Text
--- END OF TEXT/MARKDOWN ATTACHMENT ---\n`)

  expect.assert(result.content[1].type === 'text')
  expect(result.content[1].text).toEqual(`--- FILE ATTACHMENT ---
type: typescript
content:
File
--- END OF FILE ATTACHMENT ---\n`)

  expect.assert(result.content[2].type === 'text')
  expect(result.content[2].text).toEqual(`--- FILE ATTACHMENT ---
type: typescript
content:
Selection
--- END OF FILE ATTACHMENT ---\n`)

  expect.assert(result.content[3].type === 'text')
  expect(result.content[3].text).toEqual(`--- IMAGE ATTACHMENT ---`)
  expect.assert(result.content[4].type === 'image_url')
  expect(result.content[4].image_url).toEqual({url: '123'})
  expect.assert(result.content[5].type === 'text')
  expect(result.content[5].text).toEqual(`--- END OF IMAGE ATTACHMENT ---`)

  expect.assert(result.content[6].type === 'text')
  expect(result.content[6].text).toEqual(`--- PROJECT ATTACHMENT ---

Below is the directory structure of the user's current project. Use this to understand the project architecture, naming conventions, and available modules.

<project_tree>
TREE
</project_tree>

Below is the full content of the file(s) the user currently has open. Focus your suggestions and code generation primarily on these files, taking the project structure into account.

<opened_files>
Opened file:
F1

Opened file:
F2

Opened file:
README

</opened_files>

Instructions:
- Always consider the project structure when suggesting imports or cross-file references.
- If you need to see the content of a file that is in the <project_tree> but not in the <opened_files>, use your file-reading tool to fetch it.

--- END OF PROJECT ATTACHMENT ---\n`)
})
