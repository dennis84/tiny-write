import {getChunks, unifiedMergeView} from '@codemirror/merge'
import {EditorView, type ViewUpdate} from '@codemirror/view'
import {indentationMarkers} from '@replit/codemirror-indentation-markers'
import {type SetStoreFunction, type Store, unwrap} from 'solid-js/store'
import {debounce} from 'throttle-debounce'
import {yCollab, ySyncFacet} from 'y-codemirror.next'
import type * as Y from 'yjs'
import {copilot} from '@/codemirror/copilot'
import {isTauri} from '@/env'
import {deleteText, insertText, writeFile} from '@/remote/editor'
import {info} from '@/remote/log'
import {type File, Page, type SelectionRange, type State, type VisualPositionRange} from '@/state'
import {CodeMirrorService} from './CodeMirrorService'
import {CollabService} from './CollabService'
import type {ConfigService} from './ConfigService'
import {FileService} from './FileService'
import type {PrettierService} from './PrettierService'

export class CodeService {
  constructor(
    private fileService: FileService,
    private configService: ConfigService,
    private collabService: CollabService,
    private codeMirrorService: CodeMirrorService,
    private prettierService: PrettierService,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  private writeFileThrottled = debounce(1000, this.writeFile.bind(this))

  async newFile(params: Partial<File> = {}): Promise<File> {
    const file = FileService.createFile({...params, code: true})
    this.setState('files', (prev) => [...prev, file])
    return file
  }

  async init() {
    let newState = {...this.store}

    const currentFileId = this.fileService.currentFileId
    const currentFile = this.fileService.currentFile
    const share = this.store.location?.share
    const selection = this.store.location?.selection
    const merge = this.store.location?.merge
    const path = currentFile?.path
    let text: string | undefined

    info(
      `Initialize code file (id=${currentFileId}, share=${share}, selection=${JSON.stringify(selection)}, merge=${JSON.stringify(merge)}})`,
    )

    if (!currentFile) {
      throw new Error(`File not found (id=${currentFileId})`)
    }

    if (!currentFile.code) {
      throw new Error(`File aready exists of type editor (id=${currentFileId})`)
    }

    if (path) {
      text = (await FileService.loadTextFile(path)).text
    }

    newState = {
      ...newState,
      collab: CollabService.create(currentFile.id, Page.Code, share),
      args: {
        ...newState.args,
        selection,
        merge,
      },
    }

    const ydoc = newState.collab?.ydoc
    if (text && ydoc) {
      const subdoc = CollabService.getSubdoc(ydoc, currentFile.id)
      this.updateText(currentFile, subdoc, text)
    }

    this.setState(newState)
  }

  renderEditor(file: File, el: Element) {
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

  updateLang(file: File, lang: string) {
    this.fileService.updateFile(file.id, {codeLang: lang})
    this.updateEditorState(file)
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

    const merge = this.store.args?.merge

    let doc = type.toString()
    if (merge?.doc) {
      doc = merge.range ? CodeMirrorService.replaceSlice(doc, merge.doc, merge.range) : merge.doc
    }

    const extensions = [...indentationMarkers({markerType: 'fullScope'})]

    if (merge) {
      extensions.push(
        unifiedMergeView({original: type.toString()}),
        EditorView.updateListener.of((update) => {
          const chunks = getChunks(update.view.state)
          // check if all diffs resolved
          if (!chunks?.chunks.length) {
            const subdoc = this.collabService.getSubdoc(file.id)
            const type = subdoc.getText(file.id)
            type.delete(0, type.length)
            type.insert(0, update.state.doc.toString())
            this.fileService.updateFile(file.id, {lastModified: new Date()})
            this.setState('args', 'merge', undefined)
          }
        }),
      )
    } else {
      extensions.push(
        EditorView.updateListener.of((update) => this.onUpdate(file, update)),
        yCollab(type, this.store.collab?.provider.awareness, {undoManager: false}),
      )

      if (isTauri()) {
        extensions.push(
          copilot({
            configure: () => {
              const {tabWidth, useTabs} = this.configService.prettier
              const path = file.path ?? `buffer://${file.id}`
              const language = file.codeEditorView?.contentDOM.dataset.language ?? ''
              return {path, language, tabWidth, useTabs}
            },
          }),
        )
      }
    }

    const editor = this.codeMirrorService.createEditor({
      parent,
      doc,
      lang: file.codeLang,
      path: file.path,
      extensions,
    })

    if (this.store.args?.selection) {
      editor.editorView.dispatch({
        selection: this.createSelection(editor.editorView, this.store.args.selection),
        scrollIntoView: true,
      })
    }

    this.collabService.undoManager?.addTrackedOrigin(editor.editorView.state.facet(ySyncFacet))

    const fileIndex = this.store.files.findIndex((f) => f.id === file.id)
    this.setState('files', fileIndex, 'codeEditorView', editor.editorView)
  }

  private async onUpdate(file: File, update: ViewUpdate) {
    this.fileService.updateFile(file.id, {
      lastModified: new Date(),
    })
    this.setState('lastTr', Date.now())

    await this.saveEditor(file, update)
  }

  private async saveEditor(file: File, update: ViewUpdate) {
    await FileService.saveFile(file)

    if (!update.docChanged) {
      return
    }

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
