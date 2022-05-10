import {EditorView, ViewPlugin, ViewUpdate} from '@codemirror/view'
import {language} from '@codemirror/language'
import {toBase64} from 'js-base64'
import {v4 as uuidv4} from 'uuid'
import mermaid from 'mermaid'
import {CodeBlockView} from './view'

export default (codeBlock: CodeBlockView) =>
  ViewPlugin.fromClass(class {
    id = uuidv4()
    view: EditorView
    output: HTMLElement
    download: HTMLElement

    constructor(view: EditorView) {
      this.view = view
    }

    destroy() {
      if (this.output) {
        codeBlock.outer.removeChild(this.output)
      }
      this.output = null
    }

    update(update: ViewUpdate) {
      if (!this.output) {
        this.renderDOM()
        this.updateDOM()
      }

      if (
        update.docChanged ||
        update.startState.facet(language) != update.state.facet(language)
      ) {
        this.updateDOM()
      }
    }

    renderDOM() {
      const div = document.createElement('div')
      div.className = 'mermaid'
      div.id = `mermaid-${this.id}`
      this.output = div
      codeBlock.outer.appendChild(this.output)

      const span = document.createElement('span')
      span.className = 'download'
      span.setAttribute('title', 'download')
      span.textContent = '💾'
      span.addEventListener('mousedown', () => {
        const id = `mermaid-graph-${this.id}`
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const svg = document.getElementById(id)
        const rect = svg.getBoundingClientRect()
        const ratio = rect.height / rect.width
        canvas.width = 1080
        canvas.height = 1080 * ratio
        ctx.fillStyle = 'transparent'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        const image = new Image()
        const downloadLink = document.createElement('a')
        downloadLink.setAttribute('download', 'mermaid-graph.png')
        image.onload = () => {
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob)
            downloadLink.setAttribute('href', url)
            downloadLink.click()
          });
        }

        const clone = svg.cloneNode(true) as HTMLElement
        clone.setAttribute('height', canvas.height.toString())
        clone.setAttribute('width', canvas.width.toString())
        image.src = `data:image/svg+xml;base64,${toBase64(clone.outerHTML)}`
      })

      this.download = span
      this.output.appendChild(this.download)
    }

    updateDOM() {
      if (codeBlock.getLang() !== 'mermaid') {
        this.output.style.display = 'none'
        return
      }

      const content = this.view.state.doc.toString()
      if (!content) {
        this.output.style.display = 'none'
        return
      }

      this.output.style.display = 'flex'
      mermaid.initialize({
        startOnLoad: false,
        theme: codeBlock.options.dark ? 'dark' : 'default',
        fontFamily: codeBlock.options.font,
      })

      // fixes cut off text
      setTimeout(() => {
        try {
          mermaid.render(`mermaid-graph-${this.id}`, content, (svgCode) => {
            this.output.innerHTML = svgCode
            this.output.appendChild(this.download)
          })
        } catch (err) {
          const error = document.createElement('code')
          error.textContent = err.message
          this.output.innerHTML = ''
          this.output.appendChild(error)
          const errorDiv = document.getElementById(`dmermaid-graph-${this.id}`)
          if (errorDiv) document.body.removeChild(errorDiv)
        }
      }, 100)
    }
  })
