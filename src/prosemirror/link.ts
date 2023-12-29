import {ProseMirrorExtension} from '.'

export default (): ProseMirrorExtension => ({
  schema: (prev) => ({
    ...prev,
    marks: (prev.marks as any).append(editLinkSchema),
  }),
})

const editLinkSchema = {
  edit_link: {
    toDOM: () => ['span', {class: 'edit-link'}],
  },
}
