import {expect, test} from 'vitest'
import {AttachmentType, type Message} from '@/types'
import {MessageUtil} from '@/utils/MessageUtil'

test('toModelMessage', () => {
  const message: Message = {
    id: '1',
    role: 'user',
    content: '123',
    attachments: [
      {type: AttachmentType.Text, fileId: '1', content: 'Text'},
      {type: AttachmentType.File, fileId: '2', content: 'File', codeLang: 'typescript'},
      {
        type: AttachmentType.Selection,
        fileId: '3',
        content: 'Selection',
        codeLang: 'typescript',
        selection: [1, 10],
      },
      {type: AttachmentType.Image, content: 'data:123', name: 'img', mediaType: 'image/png'},
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

  const result = MessageUtil.toModelMessage(message)
  expect.assert(Array.isArray(result.content))

  expect.assert(result.content[0].type === 'text')
  expect(result.content[0].text).toEqual(`--- FILE ATTACHMENT ---
<file ref="1" lang="text/markdown">Text</file>
--- END OF FILE ATTACHMENT ---\n`)

  expect.assert(result.content[1].type === 'text')
  expect(result.content[1].text).toEqual(`--- FILE ATTACHMENT ---
<file ref="2" lang="typescript">File</file>
--- END OF FILE ATTACHMENT ---\n`)

  expect.assert(result.content[2].type === 'text')
  expect(result.content[2].text).toEqual(`--- FILE ATTACHMENT ---
<file ref="3" lang="typescript" range="1-10">Selection</file>
--- END OF FILE ATTACHMENT ---\n`)

  expect.assert(result.content[3].type === 'text')
  expect(result.content[3].text).toEqual(`--- IMAGE ATTACHMENT ---`)
  expect.assert(result.content[4].type === 'file')
  expect(result.content[4].data).toEqual(new URL('data:123'))
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

test('isEmptyUsage', () => {
  expect(MessageUtil.isEmptyUsage(undefined)).toBe(true)
  expect(MessageUtil.isEmptyUsage({inputTokens: 0, outputTokens: 0})).toBe(true)
  expect(
    MessageUtil.isEmptyUsage({
      inputTokens: undefined as unknown as number,
      outputTokens: 5,
    }),
  ).toBe(true)
  expect(
    MessageUtil.isEmptyUsage({
      inputTokens: 5,
      outputTokens: undefined as unknown as number,
    }),
  ).toBe(true)
  expect(MessageUtil.isEmptyUsage({inputTokens: 0, outputTokens: 5})).toBe(false)
  expect(MessageUtil.isEmptyUsage({inputTokens: 5, outputTokens: 0})).toBe(false)
  expect(MessageUtil.isEmptyUsage({inputTokens: 5, outputTokens: 5})).toBe(false)
})
