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
        content: [
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
content: Text
--- END OF TEXT/MARKDOWN ATTACHMENT ---\n\n`)

  expect.assert(result.content[1].type === 'text')
  expect(result.content[1].text).toEqual(`--- FILE ATTACHMENT ---
type: typescript
content: File
--- END OF FILE ATTACHMENT ---\n\n`)

  expect.assert(result.content[2].type === 'text')
  expect(result.content[2].text).toEqual(`--- FILE ATTACHMENT ---
type: typescript
content: Selection
--- END OF FILE ATTACHMENT ---\n\n`)

  expect.assert(result.content[3].type === 'text')
  expect(result.content[3].text).toEqual(`--- IMAGE ATTACHMENT ---\n`)
  expect.assert(result.content[4].type === 'image_url')
  expect(result.content[4].image_url).toEqual({url: '123'})
  expect.assert(result.content[5].type === 'text')
  expect(result.content[5].text).toEqual(`--- END OF IMAGE ATTACHMENT ---\n\n`)

  expect.assert(result.content[6].type === 'text')
  expect(result.content[6].text).toEqual(`--- PROJECT ATTACHMENT ---
projectName: Project
type: Multi-file Project
The following contains multiple files or code/markdown items from a project:\n`)
  expect.assert(result.content[7].type === 'text')
  expect(result.content[7].text).toEqual(`Project Item:
F1\n\n`)
  expect.assert(result.content[8].type === 'text')
  expect(result.content[8].text).toEqual(`Project Item:
F2\n\n`)
  expect.assert(result.content[9].type === 'text')
  expect(result.content[9].text).toEqual(`Project Item:
README\n\n`)
  expect.assert(result.content[10].type === 'text')
  expect(result.content[10].text).toEqual(`--- END OF PROJECT ATTACHMENT ---\n\n`)
})
