import {Node} from 'prosemirror-model'
import {ProseMirrorExtension} from '.'

export default (): ProseMirrorExtension => ({
  schema: (prev) => ({
    ...prev,
    marks: (prev.marks as any).append(editLinkSchema),
  }),
})

const editLinkSchema = {
  edit_link: {
    attrs: {href: {default: null}},
    toDOM: (n: Node) => ['span', {class: 'edit-link', 'data-href': n.attrs.href}],
  },
}
