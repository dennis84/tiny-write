import {expect, test} from 'vitest'
import {ThreadContext} from '@/utils/ThreadContext'

test('tokenCount - counts user messages as input and assistant messages as output', () => {
  const context = new ThreadContext()
  context.addMessage({role: 'user', content: 'A'})
  context.addMessage({role: 'assistant', content: 'B'})

  const result = context.tokenCount()

  expect(result.inputTokens).toBeGreaterThan(0)
  expect(result.outputTokens).toBeGreaterThan(0)
})
