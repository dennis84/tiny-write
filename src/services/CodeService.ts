import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {EditorView} from '@codemirror/view'
import {yCollab, ySyncFacet} from 'y-codemirror.next'
import {File, State} from '@/state'
import * as remote from '@/remote'
import {FileService} from './FileService'
import {CollabService} from './CollabService'
import {AppService} from './AppService'
import {CodeMirrorService} from './CodeMirrorService'
import {PrettierService} from './PrettierService'

export class CodeService {
  constructor(
    private fileService: FileService,
    private appService: AppService,
    private collabService: CollabService,
    private codeMirrorService: CodeMirrorService,
    private prettierService: PrettierService,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  async newFile(): Promise<File> {
    const file = FileService.createFile({code: true})
    this.setState('files', (prev) => [...prev, file])
    return file
  }

  async openFile(id: string, share = false) {
    remote.debug(`Open file: (id=${id}, share=${share}, mode=code)`)
    const state: State = unwrap(this.store)

    try {
      let file = this.fileService.findFileById(id)
      let text: string | undefined

      if (!file) {
        file = FileService.createFile({id, code: true})
        state.files.push(file)
      }

      if (file?.path) {
        text = (await FileService.loadTextFile(file.path)).text
      }

      if (state.args?.room) state.args.room = undefined

      const update = await FileService.activateFile(state, file)
      update.collab = CollabService.create(file.id, update.mode, share)
      this.setState(update)
      if (text) this.updateText(text)
    } catch (error: any) {
      this.appService.setError({error, fileId: id})
    }
  }

  renderEditor(file: File, el: Element) {
    this.updateEditorState(file, el)
  }

  updateText(doc: string | undefined) {
    if (!doc) return
    const currentFile = this.fileService.currentFile
    if (!currentFile) return
    if (!this.store.collab?.ydoc) {
      return
    }

    const subdoc = this.collabService.getSubdoc(currentFile.id)
    const type = subdoc.getText(currentFile.id)
    type.delete(0, type.length)
    type.insert(0, doc)
    remote.info(`Updated text from file`)
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

    const editor = this.codeMirrorService.createEditor({
      parent,
      doc: type.toString(),
      lang: file.codeLang,
      extensions: [
        EditorView.updateListener.of(() => this.onUpdate(file)),
        yCollab(type, this.store.collab?.provider.awareness, {undoManager: false}),
      ],
    })

    this.collabService.undoManager?.addTrackedOrigin(editor.editorView.state.facet(ySyncFacet))

    const fileIndex = this.store.files.findIndex((f) => f.id === file.id)
    this.setState('files', fileIndex, 'codeEditorView', editor.editorView)
  }

  private async onUpdate(file: File) {
    this.fileService.updateFile(file.id, {
      lastModified: new Date(),
    })

    await this.saveEditor()
  }

  private async saveEditor() {
    const file = this.fileService.currentFile
    if (!file) return
    await FileService.saveFile(file)
    // TODO: write to file
  }
}
