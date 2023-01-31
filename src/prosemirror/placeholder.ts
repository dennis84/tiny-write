import {Plugin} from 'prosemirror-state'
import {DecorationSet, Decoration} from 'prosemirror-view'
import {ProseMirrorExtension, isEmpty} from '@/prosemirror'

const placeholder = (text: string) => new Plugin({
  props: {
    decorations(state) {
      if (isEmpty(state)) {
        const el = document.createElement('span')
        el.setAttribute('contenteditable', 'false')
        el.classList.add('placeholder')
        el.textContent = text
        return DecorationSet.create(state.doc, [Decoration.widget(1, el)])
      }
    }
  }
})

export default (text: string): ProseMirrorExtension => ({
  plugins: (prev) => [
    ...prev,
    placeholder(text),
  ]
})
