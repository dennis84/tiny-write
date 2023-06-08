import {createEffect} from 'solid-js'
import {styled} from 'solid-styled-components'
import {Node} from 'prosemirror-model'
import * as Y from 'yjs'
import {yDocToProsemirrorJSON} from 'y-prosemirror'
import {Box2d} from '@tldraw/primitives'
import {Canvas, isBoxElement, isEditorElement, isImageElement, useState} from '@/state'
import {createExtensions, createSchema} from '@/prosemirror-setup'

interface Props {
  canvas: Canvas;
}

const Container = styled('div')`
  display: flex;
  justify-content: center;
  > canvas {
    height: 100%;
  }
`

export default (props: Props) => {
  let ref!: HTMLDivElement
  const [, ctrl] = useState()
  const schema = createSchema(createExtensions({ctrl, markdown: false}))

  createEffect(() => {
    const canvas = createHiPPICanvas(136, 172)
    const ctx = canvas.getContext('2d')!
    const frame = new Box2d(0, 0, 0, 0)

    for (const el of props.canvas.elements) {
      if (!isEditorElement(el) && !isImageElement(el)) continue
      const box = new Box2d(el.x, el.y, el.width, el.height)
      frame.expand(box)
    }

    let r = canvas.width / window.devicePixelRatio / frame.w
    if (frame.h > frame.w) {
      r = canvas.height / window.devicePixelRatio / frame.h
    }

    const style = getComputedStyle(document.body)
    const border = style.getPropertyValue('--border')
    const font = style.getPropertyValue('--menu-font-family')
    const foreground = style.getPropertyValue('--foreground')
    const background = style.getPropertyValue('--background')

    for (const el of props.canvas.elements) {
      if (!isBoxElement(el)) continue

      const x = (el.x - frame.x) * r
      const y = (el.y - frame.y) * r
      const w = el.width * r
      const h = el.height * r

      if (isImageElement(el)) {
        const img = new Image()
        img.onload = () => ctx.drawImage(img, x, y, w, h)
        img.src = el.src
      } else if (isEditorElement(el)) {
        ctx.fillStyle = background
        ctx.strokeStyle = border
        ctx.rect(x, y, w, h)
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.beginPath()
        ctx.fill()
        ctx.closePath()

        const file = ctrl.file.findFile({id: el.id})
        if (!file) continue
        const ydoc = new Y.Doc({gc: false})
        Y.applyUpdate(ydoc, file.ydoc)
        const state = yDocToProsemirrorJSON(ydoc, file.id)
        const doc = Node.fromJSON(schema, state)
        ctx.font = '6px ' + font
        ctx.fillStyle = foreground
        ctx.beginPath()
        wrapText(ctx, doc, x + 2, y + 6, w - 4, h - 2, 6)
        ctx.closePath()
      }
    }

    ref.innerHTML = ''
    ref.append(canvas)
  })

  return (
    <Container ref={ref} />
  )
}

const wrapText = (
  context: CanvasRenderingContext2D,
  doc: Node,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  lineHeight: number
) => {
  let text = ''
  const maxLen = 300

  doc.descendants((node) => {
    if (text.length >= maxLen) return false
    if (!node.isText) return
    text += node.textContent + '\n'
  })

  let line = ''
  let curY = y
  for (let n = 0; n < text.length; n++) {
    const char = text[n]
    const testLine = line + char
    const metrics = context.measureText(testLine)
    const testWidth = metrics.width
    if (char === '\n') {
      context.fillText(line, x, curY)
      line = ''
      curY += lineHeight
    } else if (testWidth > maxWidth) {
      context.fillText(line, x, curY)
      line = text[n]
      curY += lineHeight
    } else {
      line = testLine
    }

    if  (curY + lineHeight > y + maxHeight) return
  }

  context.fillText(line, x, curY)
}

const createHiPPICanvas = (width: number, height: number) => {
  const ratio = window.devicePixelRatio
  const canvas = document.createElement('canvas')

  canvas.width = width * ratio
  canvas.height = height * ratio
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
  canvas.getContext('2d')?.scale(ratio, ratio)
  return canvas
}
