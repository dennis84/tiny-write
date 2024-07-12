import {SetStoreFunction, Store, unwrap} from 'solid-js/store'
import {EditorView} from '@codemirror/view'
import {yCollab} from 'y-codemirror.next'
import {File, State} from '@/state'
import * as remote from '@/remote'
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

    const update = await FileService.activateFile({
      ...state,
      args: {cwd: state.args?.cwd},
      files: [...state.files, file],
    }, file)

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
      this.ctrl.collab.init()
      if (text) this.updateText(text)
    } catch (error: any) {
      this.ctrl.app.setError({error, fileId: id})
    }
  }

  renderEditor(id: string, el: HTMLElement) {
    let file = this.ctrl.file.findFileById(id)

    if (!file) {
      const parentId = this.ctrl.canvas.currentCanvas?.id
      file = FileService.createFile({id, parentId, code: true})
      this.setState('files', (prev) => [...prev, file!])
      this.saveEditor()
    }

    if (!file?.path) {
      this.ctrl.collab.apply(file)
    }

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
    if (!currentFile) return
    const subdoc = this.ctrl.collab.getSubdoc(currentFile.id)
    const type = subdoc.getText(currentFile.id)
    const code = type?.toString()
    if (code) {
      try {
        const value = await this.ctrl.prettier.format(code, 'js', this.store.config.prettier)
        type?.delete(0, type.length)
        type?.insert(0, value)
      } catch (_e) {
        // ignore
      }
    }
  }

  private updateEditorState(file: File, el?: HTMLElement) {
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
        yCollab(type, this.store.collab?.provider.awareness, {
          undoManager: this.store.collab?.undoManager ?? false
        }),
      ]
    })

    const fileIndex = this.store.files.findIndex((f) => f.id === file.id)
    this.setState('files', fileIndex, 'codeEditorView', editor.editorView)
  }

  private async onUpdate() {
    const currentFile = this.ctrl.file.currentFile
    if (!currentFile) return
    this.ctrl.file.updateFile(currentFile.id, {
      lastModified: new Date()
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
