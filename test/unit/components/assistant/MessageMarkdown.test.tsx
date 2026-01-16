import {render} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'
import {mock} from 'vitest-mock-extended'
import {MessageMarkdown} from '@/components/assistant/MessageMarkdown'
import type {DB} from '@/db'
import {stubLocation} from '../../testutil/util'

vi.mock('@/db', () => ({DB: mock<DB>()}))

test('render - code', async () => {
  stubLocation('/assistant')

  const {container} = render(() => <MessageMarkdown content="`[]abc`" />)
  expect(container.innerHTML).toEqual('<p><span><code>[]abc</code></span></p>')
})

test('render - parse error', async () => {
  stubLocation('/assistant')

  const {container} = render(() => <MessageMarkdown content="`[]abc" />)
  expect(container.innerHTML).toEqual('')
})
