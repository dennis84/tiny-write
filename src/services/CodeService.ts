import {getChunks, unifiedMergeView} from '@codemirror/merge'
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  lineNumbers,
  type ViewUpdate,
} from '@codemirror/view'
import {indentationMarkers} from '@replit/codemirror-indentation-markers'
import {debounce} from '@solid-primitives/scheduled'
import {type SetStoreFunction, type Store, unwrap} from 'solid-js/store'
import {yCollab, ySyncFacet} from 'y-codemirror.next'
import * as Y from 'yjs'
import {deleteText, insertText, writeFile} from '@/remote/editor'
import {info} from '@/remote/log'
import {type File, Page, type SelectionRange, type State, type VisualPositionRange} from '@/types'
import {CodeMirrorService} from './CodeMirrorService'
import type {CollabService} from './CollabService'
import {FileService} from './FileService'
import type {LocationService} from './LocationService'
import type {PrettierService} from './PrettierService'

export class CodeService {
  constructor(
    private fileService: FileService,
    private collabService: CollabService,
    private codeMirrorService: CodeMirrorService,
    private prettierService: PrettierService,
    private locationService: LocationService,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  private writeFileThrottled = debounce(this.writeFile.bind(this), 1000)

  async newFile(params: Partial<File> = {}): Promise<File> {
    return await this.fileService.newFile({...params, code: true})
  }

  async init(id: string, existingYdoc?: Y.Doc) {
    const file = this.fileService.findFileById(id)
    const share = this.locationService.state?.share
    const path = file?.path
    let text: string | undefined

    info(`Initialize code file (id=${id}, share=${share})`)

    if (!file) {
      throw new Error(`File not found (id=${id})`)
    }

    if (!file.code) {
      throw new Error(`File aready exists of type editor (id=${id})`)
    }

    if (path) {
      text = (await FileService.loadTextFile(path)).text
    }

    if (!existingYdoc) {
      this.collabService.init(file.id, Page.Code, share)
    }

    this.collabService.createSubdocProvider(id)
    info(`Provider created sucessfully`)

    if (file.ydoc) {
      const subdoc = this.collabService.getSubdoc(file.id)
      info(`Update code editor state from existing file ydoc (bytes=${file.ydoc.byteLength})`)
      Y.applyUpdate(subdoc, file.ydoc)
    }

    // Replace ydoc state with file content
    if (text) {
      const subdoc = this.collabService.getSubdoc(file.id)
      info('Update editor text from file')
      this.updateText(file, subdoc, text)
    }

    if (!existingYdoc) {
      this.collabService.registerListeners()
    }

    this.collabService.addToScope(file)

    const subdoc = this.collabService.getSubdoc(file.id)
    subdoc.on('sync', () => {
      const meta = subdoc.getMap('meta')

      subdoc.transact(() => {
        meta.set('codeLang', file.codeLang ?? 'plaintext')
      }, subdoc.clientID)

      meta.observe((_events, transaction) => {
        if (subdoc.clientID === transaction.origin) {
          return
        }

        const lang = meta.get('codeLang') as string
        this.updateLang(file, lang, false)
      })
    })

    if (share) {
      this.collabService.connect(id)
    }
  }

  renderEditor(file: File, el: Element) {
    info(`Render code editor for file (id=${file.id})`)
    this.updateEditorState(file, el)
  }

  updateText(file: File, subdoc: Y.Doc, doc: string | undefined) {
    if (!doc) return
    const type = subdoc.getText(file.id)
    type.delete(0, type.length)
    type.insert(0, doc)
    info(`Updated code text from file`)
  }

  updateConfig(file: File) {
    this.updateEditorState(file)
  }

  updateLang(file: File, lang: string, broadcast = true) {
    this.fileService.updateFile(file.id, {codeLang: lang})
    this.updateEditorState(file)

    if (broadcast) {
      const subdoc = this.collabService.getSubdoc(file.id)
      subdoc.transact(() => {
        subdoc.getMap('meta').set('codeLang', file.codeLang)
      }, subdoc.clientID)
    }
  }

  async prettify(file: File): Promise<void> {
    const codeEditorView = file.codeEditorView
    if (!codeEditorView) return
    const lang = codeEditorView.contentDOM.dataset.language
    if (!lang) return

    const config = unwrap(this.store.config.prettier)
    await this.codeMirrorService.format(codeEditorView, lang, config)
  }

  async prettifyCheck(file: File): Promise<boolean> {
    const codeEditorView = file.codeEditorView
    if (!codeEditorView) return false
    const lang = codeEditorView.contentDOM.dataset.language
    if (!lang) return false

    const config = unwrap(this.store.config.prettier)
    return this.prettierService.check(codeEditorView.state.doc.toString(), lang, config)
  }

  private updateEditorState(file: File, el?: Element) {
    if (!file.codeEditorView && !el) {
      return
    }

    const subdoc = this.collabService.getSubdoc(file.id)
    const type = subdoc.getText(file.id)
    if (!type) return

    const parent = file.codeEditorView?.dom.parentElement ?? el
    file.codeEditorView?.destroy()

    const merge = this.locationService.state?.merge

    let doc = type.toString()
    if (merge?.doc) {
      doc = merge.range ? CodeMirrorService.replaceSlice(doc, merge.doc, merge.range) : merge.doc
    }

    const extensions = [
      ...indentationMarkers({markerType: 'fullScope'}),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      lineNumbers(),
    ]

    if (merge) {
      extensions.push(
        unifiedMergeView({original: type.toString()}),
        EditorView.updateListener.of((update) => {
          const chunks = getChunks(update.view.state)
          // check if all diffs resolved
          if (!chunks?.chunks.length) {
            const type = subdoc.getText(file.id)
            type.delete(0, type.length)
            type.insert(0, update.state.doc.toString())
            this.fileService.updateFile(file.id, {
              lastModified: new Date(),
              ydoc: Y.encodeStateAsUpdate(subdoc),
            })
          }

          this.setState('lastTr', Date.now())
        }),
      )
    } else {
      extensions.push(
        EditorView.updateListener.of(async (update) => {
          // Detect doc changes and selection changes for assistant context
          this.setState('lastTr', Date.now())
          if (!update.docChanged) return
          this.fileService.updateFile(file.id, {
            lastModified: new Date(),
            ydoc: Y.encodeStateAsUpdate(subdoc),
          })
          await this.saveEditor(file, update)
        }),
        yCollab(type, this.collabService.provider?.awareness, {undoManager: false}),
      )
    }

    const editor = this.codeMirrorService.createEditor({
      id: file.id,
      parent,
      doc,
      lang: file.codeLang,
      path: file.path,
      extensions,
    })

    if (this.locationService.state?.selection) {
      editor.editorView.dispatch({
        selection: this.createSelection(editor.editorView, this.locationService.state.selection),
        scrollIntoView: true,
      })
    }

    this.collabService.undoManager?.addTrackedOrigin(editor.editorView.state.facet(ySyncFacet))

    this.fileService.updateFile(file.id, {codeEditorView: editor.editorView})
  }

  private async saveEditor(file: File, update: ViewUpdate) {
    await FileService.saveFile(file)

    const path = file.path
    if (path) {
      update.changes.iterChanges(async (fromA, toA, _fromB, toB, insert) => {
        const text = insert.sliceString(0, insert.length, '\n')
        if (fromA !== toA) {
          await deleteText(path, {fromA, toA})
        }
        if (text.length > 0) {
          await insertText(path, {fromA, toB, text})
        }
      })

      this.writeFileThrottled(file)
    }
  }

  private async writeFile(file: File) {
    if (file.path) {
      await writeFile(file.path)
    }
  }

  private createSelection(view: EditorView, range: VisualPositionRange): SelectionRange {
    const anchor = view.state.doc.line(range.start.line + 1).from + range.start.character
    let head: number | undefined
    if (range.end) {
      head = view.state.doc.line(range.end.line + 1).from + range.end.character
    }

    return {
      anchor,
      head,
    }
  }
}
