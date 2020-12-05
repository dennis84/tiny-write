const blank = '\xa0'

const onArrow = (dir) => (state, dispatch) => {
  if (!state.selection.empty) return false
  const $pos = state.selection.$head
  const isCode = $pos.marks().find(m => m.type.name === 'code')
  const tr = state.tr

  if (dir === 'left') {
    const above = state.doc.resolve($pos.pos - $pos.parentOffset - 1)
    if (!$pos.nodeBefore && !above.nodeBefore && isCode) {
      tr.insertText(blank, $pos.pos-1, $pos.pos)
      dispatch(tr)
    }
  } else {
    const below = state.doc.resolve($pos.pos - $pos.parentOffset + $pos.parent.nodeSize - 1)
    if (!$pos.nodeAfter && !below.nodeAfter && isCode) {
      tr.insertText(blank, $pos.pos, $pos.pos+1)
      dispatch(tr)
    }
  }
}

export const codeKeymap = {
  'ArrowLeft': onArrow('left'),
  'ArrowRight': onArrow('right'),
}
