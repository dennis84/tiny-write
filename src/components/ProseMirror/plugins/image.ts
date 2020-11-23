import {Plugin} from 'prosemirror-state'
import isImage from 'is-image'

export const dropImage = (schema) => new Plugin({
  props: {
    handleDOMEvents: {
      drop: (view, event) => {
        event.preventDefault()

        const text = event.dataTransfer.getData('text/plain')
        const {files} = event.dataTransfer

        const insertImage = (src) => {
          const tr = view.state.tr
          const node = schema.nodes.image.create({src})
          const pos = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          }).pos

          tr.insert(pos, node)
          view.dispatch(tr)
        }

        const insertData = () => undefined

        if (files && files.length > 0) {
          for (const file of files) {
            const reader = new FileReader()
            const [mime] = file.type.split('/')

            if (mime === 'image') {
              reader.addEventListener('load', () => {
                const url = reader.result
                insertImage(url)
              })

              reader.readAsDataURL(file)
            }
          }
        } else if (isImage(text)) {
          insertImage(text)
        } else {
          insertData()
        }
      }
    }
  }
})
