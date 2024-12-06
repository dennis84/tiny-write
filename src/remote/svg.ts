import * as dialog from '@tauri-apps/plugin-dialog'
import * as fs from '@tauri-apps/plugin-fs'
import {toBase64} from 'js-base64'
import {isTauri} from '@/env'

export const saveSvg = async (svg: HTMLElement) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const rect = svg.getBoundingClientRect()
  const ratio = rect.height / rect.width
  canvas.width = 1080
  canvas.height = 1080 * ratio
  ctx.fillStyle = 'transparent'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const image = new Image()
  const svgString = svg.outerHTML
    .replaceAll('<br>', '<br/>')
    .replaceAll(/<img([^>]*)>/g, (_, g: string) => `<img ${g} />`)
  image.src = `data:image/svg+xml;base64,${toBase64(svgString)}`
  await image.decode()

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  canvas.toBlob(async (blob) => {
    if (!blob) return

    const filename = 'mermaid-graph.png'
    if (isTauri()) {
      const path = await dialog.save({defaultPath: `./${filename}`})
      if (!path) return
      const buffer = await blob.arrayBuffer()
      const contents = new Uint8Array(buffer)
      await fs.writeFile(path, contents)
      return
    }

    const downloadLink = document.createElement('a')
    downloadLink.setAttribute('download', filename)
    const url = URL.createObjectURL(blob)
    downloadLink.setAttribute('href', url)
    downloadLink.click()
  })
}
