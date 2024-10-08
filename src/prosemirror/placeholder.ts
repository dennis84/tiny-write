import {Plugin} from 'prosemirror-state'
import {DecorationSet, Decoration} from 'prosemirror-view'
import {ProseMirrorService} from '@/services/ProseMirrorService'

export const placeholder = (text: string) =>
  new Plugin({
    props: {
      decorations(state) {
        if (ProseMirrorService.isEmpty(state)) {
          const el = document.createElement('span')
          el.setAttribute('contenteditable', 'false')
          el.classList.add('placeholder')
          el.textContent = text
          return DecorationSet.create(state.doc, [Decoration.widget(1, el)])
        }
      },
    },
  })
