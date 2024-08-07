import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {EditorView} from '@codemirror/view'
import {yCollab, ySyncFacet} from 'y-codemirror.next'
import {File, State} from '@/state'
import * as remote from '@/remote'
import {format} from '@/codemirror/prettify'
import {Ctrl} from '.'
import {FileService} from './FileService'
import {CollabService} from './CollabService'

export class CodeService {
  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  async newFile() {
    const state = unwrap(this.store)
    const file = FileService.createFile({code: true})

    const update = await FileService.activateFile(
      {
        ...state,
        args: {cwd: state.args?.cwd},
        files: [...state.files, file],
      },
      file,
    )

    update.collab = CollabService.create(file.id, state.mode, false)
    this.setState(update)
  }

  async openFile(id: string) {
    remote.debug(`Open file: ${id}`)
    const state: State = unwrap(this.store)

    try {
      const file = this.ctrl.file.findFileById(id)
      let text: string | undefined

      if (file?.path) {
        text = (await FileService.loadTextFile(file.path)).text
      }

      if (!file) return
      if (state.args?.room) state.args.room = undefined

      const update = await FileService.activateFile(state, file)
      update.collab = CollabService.create(file.id, update.mode, false)
      this.setState(update)
      if (text) this.updateText(text)
    } catch (error: any) {
      this.ctrl.app.setError({error, fileId: id})
    }
  }

  renderEditor(file: File, el: Element) {
    this.updateEditorState(file, el)
  }

  updateText(doc: string | undefined) {
    if (!doc) return
  }

  updateConfig(file: File) {
    this.updateEditorState(file)
  }

  updateLang(file: File, lang: string) {
    this.ctrl.file.updateFile(file.id, {codeLang: lang})
    this.updateEditorState(file)
  }

  async prettify() {
    const currentFile = this.ctrl.file.currentFile
    if (!currentFile?.codeEditorView) return
    const lang = currentFile?.codeEditorView?.contentDOM.dataset.language ?? ''
    const config = unwrap(this.store.config.prettier)
    return format(currentFile.codeEditorView, lang, config)
  }

  private updateEditorState(file: File, el?: Element) {
    if (!file.codeEditorView && !el) {
      return
    }

    const subdoc = this.ctrl.collab.getSubdoc(file.id)
    const type = subdoc.getText(file.id)
    if (!type) return

    const parent = file.codeEditorView?.dom.parentElement ?? el
    file.codeEditorView?.destroy()

    const editor = this.ctrl.codeMirror.createEditor({
      parent,
      doc: type.toString(),
      lang: file.codeLang,
      extensions: [
        EditorView.updateListener.of(() => this.onUpdate()),
        yCollab(type, this.store.collab?.provider.awareness, {undoManager: false}),
      ],
    })

    this.ctrl.collab.undoManager?.addTrackedOrigin(editor.editorView.state.facet(ySyncFacet))

    const fileIndex = this.store.files.findIndex((f) => f.id === file.id)
    this.setState('files', fileIndex, 'codeEditorView', editor.editorView)
  }

  private async onUpdate() {
    const currentFile = this.ctrl.file.currentFile
    if (!currentFile) return
    this.ctrl.file.updateFile(currentFile.id, {
      lastModified: new Date(),
    })
    await this.saveEditor()
  }

  private async saveEditor() {
    const file = this.ctrl.file.currentFile
    if (!file) return
    await FileService.saveFile(file)
    // TODO: write to file
  }
}
