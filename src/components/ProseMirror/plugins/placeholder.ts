import {Plugin} from 'prosemirror-state'
import {DecorationSet, Decoration} from 'prosemirror-view'
import {isEmpty} from '../util'

export const placeholder = (text) => new Plugin({
  props: {
    decorations(state) {
      if (isEmpty(state)) {
        const div = document.createElement('div')
        div.classList.add('placeholder')
        div.textContent = text

        return DecorationSet.create(state.doc, [
          Decoration.widget(1, div)
        ])
      }
    }
  }
})
