import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {EditorView, ViewUpdate} from '@codemirror/view'
import {getChunks, unifiedMergeView} from '@codemirror/merge'
import * as Y from 'yjs'
import {yCollab, ySyncFacet} from 'y-codemirror.next'
import {debounce} from 'throttle-debounce'
import {indentationMarkers} from '@replit/codemirror-indentation-markers'
import {File, SelectionRange, State, VisualPositionRange} from '@/state'
import {copilot} from '@/codemirror/copilot'
import {deleteText, insertText, writeFile} from '@/remote/editor'
import {debug, info} from '@/remote/log'
import {isTauri} from '@/env'
import {FileService} from './FileService'
import {CollabService} from './CollabService'
import {AppService} from './AppService'
import {CodeMirrorService} from './CodeMirrorService'
import {PrettierService} from './PrettierService'
import {TreeService} from './TreeService'
import {ConfigService} from './ConfigService'

export interface OpenFile {
  id: string
  share?: boolean
  file?: string
  newFile?: string
  selection?: VisualPositionRange
}

export class CodeService {
  constructor(
    private fileService: FileService,
    private appService: AppService,
    private configService: ConfigService,
    private collabService: CollabService,
    private codeMirrorService: CodeMirrorService,
    private prettierService: PrettierService,
    private treeService: TreeService,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  private writeFileThrottled = debounce(1000, this.writeFile.bind(this))

  async newFile(): Promise<File> {
    const file = FileService.createFile({code: true})
    this.setState('files', (prev) => [...prev, file])
    return file
  }

  async openFile(params: OpenFile) {
    debug(`Open file: (params=${JSON.stringify(params)}, mode=code)`)
    const state: State = unwrap(this.store)

    try {
      let file = unwrap(this.fileService.findFileById(params.id))
      const path = file?.path ?? params.file
      const newFile = file?.newFile ?? params.file

      let text: string | undefined

      if (!file) {
        file = FileService.createFile({id: params.id, code: true, path, newFile})
        state.files.push(file)
      }

      if (path) {
        text = (await FileService.loadTextFile(path)).text
      }

      const update = await FileService.activateFile(state, file.id)
      update.args = {...update.args, selection: params.selection}
      update.collab = CollabService.create(file.id, update.mode, params.share)
      const subdoc = CollabService.getSubdoc(update.collab.ydoc, file.id)
      if (text) this.updateText(file, subdoc, text)
      this.setState(update)
      this.treeService.create()
    } catch (error: any) {
      this.appService.setError({error, fileId: params.id})
    }
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

  merge(file: File, newDoc: string) {
    const subdoc = this.collabService.getSubdoc(file.id)
    const type = subdoc.getText(file.id)
    if (!type) return

    const parent = file.codeEditorView?.dom.parentElement
    if (!parent) return

    file.codeEditorView?.destroy()

    const editor = this.codeMirrorService.createEditor({
      parent,
      doc: newDoc,
      lang: file.codeLang,
      extensions: [
        indentationMarkers({markerType: 'fullScope'}),
        unifiedMergeView({original: type.toString()}),
        EditorView.updateListener.of((update) => {
          const chunks = getChunks(update.view.state)
          // check if all diffs resolved
          if (!chunks?.chunks.length) {
            const currentFile = this.fileService.findFileById(file.id)
            if (!currentFile) return

            const subdoc = this.collabService.getSubdoc(currentFile.id)
            const type = subdoc.getText(currentFile.id)
            type.delete(0, type.length)
            type.insert(0, update.state.doc.toString())
            this.updateEditorState(currentFile)
          }
        }),
      ],
    })

    const fileIndex = this.store.files.findIndex((f) => f.id === file.id)
    this.setState('files', fileIndex, 'codeEditorView', editor.editorView)
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

    const editor = this.codeMirrorService.createEditor({
      parent,
      doc: type.toString(),
      lang: file.codeLang,
      path: file.path,
      extensions: [
        EditorView.updateListener.of((update) => this.onUpdate(file, update)),
        yCollab(type, this.store.collab?.provider.awareness, {undoManager: false}),
        indentationMarkers({markerType: 'fullScope'}),
        ...(isTauri() ?
          [
            copilot({
              configure: () => {
                const {tabWidth, useTabs} = this.configService.prettier
                const path = file.path ?? `buffer://${file.id}`
                const language = file.codeEditorView?.contentDOM.dataset.language ?? ''
                return {path, language, tabWidth, useTabs}
              },
            }),
          ]
        : []),
      ],
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

    if (file.path) {
      update.changes.iterChanges(async (fromA, toA, _fromB, toB, insert) => {
        const text = insert.sliceString(0, insert.length, '\n')
        if (fromA !== toA) {
          await deleteText(file.path!, {fromA, toA})
        }
        if (text.length > 0) {
          await insertText(file.path!, {fromA, toB, text})
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
    let head
    if (range.end) {
      head = view.state.doc.line(range.end.line + 1).from + range.end.character
    }

    return {
      anchor,
      head,
    }
  }
}
