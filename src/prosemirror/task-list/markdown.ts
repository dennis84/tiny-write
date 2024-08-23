import MarkdownIt from 'markdown-it'

type Token = any // not exported from markdown-it?

export const taskList = (md: MarkdownIt) => {
  md.core.ruler.after('inline', 'github-task-lists', (state) => {
    const tokens = state.tokens
    const closers: any = {}

    for (let i = 2; i < tokens.length; i++) {
      const cur = tokens[i]
      if (isTodoItem(tokens, i)) {
        const prev3 = tokens[i - 3]
        if (prev3.type === 'bullet_list_open') {
          prev3.type = 'task_list_open'
          closers[prev3.level] = 'task_list_close'
        }

        const prev2 = tokens[i - 2]
        prev2.type = 'task_list_item_open'
        const checked = /^\[[xX]\][ \u00A0]/.test(cur.content)
        if (checked) {
          prev2.attrSet('checked', 'checked')
        }

        closers[prev2.level] = 'task_list_item_close'
        cur.children![0].content = cur.children![0].content.slice(4)
      }

      if (closers[cur.level] !== undefined) {
        cur.type = closers[cur.level]
        delete closers[cur.level]
      }
    }
  })
}

const isTodoItem = (tokens: Token[], index: number) =>
  isInline(tokens[index]) &&
  isParagraph(tokens[index - 1]) &&
  isListItem(tokens[index - 2]) &&
  startsWithTodoMarkdown(tokens[index])

const isInline = (token: Token) => token.type === 'inline'
const isParagraph = (token: Token) => token.type === 'paragraph_open'
const isListItem = (token: Token) => token.type === 'list_item_open'

// The leading whitespace in a list item (token.content) is already trimmed off by markdown-it.
// The regex below checks for '[ ] ' or '[x] ' or '[X] ' at the start of the string token.content,
// where the space is either a normal space or a non-breaking space (character 160 = \u00A0).
const startsWithTodoMarkdown = (token: Token) => /^\[[xX \u00A0]\][ \u00A0]/.test(token.content)
