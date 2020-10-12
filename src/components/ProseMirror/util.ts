export const isEmpty = (state) =>
  state.doc.childCount == 1 &&
  state.doc.firstChild.isTextblock &&
  state.doc.firstChild.content.size == 0
