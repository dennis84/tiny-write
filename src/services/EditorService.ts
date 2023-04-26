import {Store, unwrap, SetStoreFunction} from 'solid-js/store'
import {EditorView} from 'prosemirror-view'
import {EditorState, Plugin, Transaction} from 'prosemirror-state'
import {Node} from 'prosemirror-model'
import {selectAll, deleteSelection} from 'prosemirror-commands'
import * as Y from 'yjs'
import {
  ySyncPluginKey,
  prosemirrorJSONToYDoc,
  yDocToProsemirrorJSON,
} from 'y-prosemirror'
import * as remote from '@/remote'
import {createExtensions, createEmptyText, createSchema, createNodeViews} from '@/prosemirror-setup'
import {State, File, FileText, Mode} from '@/state'
import {serialize, createMarkdownParser} from '@/markdown'
import {isEmpty} from '@/prosemirror'
import * as db from '@/db'
import {Ctrl} from '.'
import {OpenFile} from './FileService'

export class EditorService {
  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  updateEditorState(node?: Element) {
    const currentFile = this.ctrl.file.currentFile
    let editorView = currentFile?.editorView

    if ((!editorView && !node) || !currentFile?.id) {
      return
    }

    const extensions = createExtensions({
      ctrl: this.ctrl,
      markdown: currentFile?.markdown,
      type: this.store.collab!.ydoc!.getXmlFragment(currentFile.id),
      keymap: this.ctrl.keymap.create(),
    })

    const nodeViews = createNodeViews(extensions)
    const schema = createSchema(extensions)
    const plugins = extensions.reduce<Plugin[]>((acc, e) => e.plugins?.(acc, schema) ?? acc, [])
    const editorState = EditorState.fromJSON({schema, plugins}, createEmptyText())

    if (!editorView) {
      const dispatchTransaction = (tr: Transaction) => {
        const newState = editorView!.state.apply(tr)
        editorView!.updateState(newState)
        if (!tr.docChanged) return

        const yMeta = tr.getMeta(ySyncPluginKey)
        const maybeSkip = tr.getMeta('addToHistory') === false
        const isUndo = yMeta?.isUndoRedoOperation
        const currentFile = this.ctrl.file.currentFile

        if ((maybeSkip && !isUndo) || this.store.isSnapshot) return
        if (!currentFile) return

        this.ctrl.file.updateFile(currentFile.id, {
          lastModified: new Date(),
        })

        this.saveEditor()
        remote.log('info', '💾 Saved updated text')
      }

      editorView = new EditorView(node!, {
        state: editorState,
        nodeViews,
        dispatchTransaction,
      })

      const currentFileIndex = this.ctrl.file.currentFileIndex
      this.setState('files', currentFileIndex, 'editorView', editorView)
    }

    editorView.setProps({state: editorState, nodeViews})
    editorView.focus()
  }

  renderEditor(node: Element) {
    this.updateEditorState(node)
  }

  async discard() {
    const currentFile = this.ctrl.file.currentFile
    const editorView = currentFile?.editorView
    if (!editorView) return

    if (this.store.error) {
      await this.deleteFile({id: currentFile.id})
      this.setState('error', undefined)
      return true
    } else if (currentFile?.path) {
      await this.discardText()
      editorView?.focus()
      return true
    } else if (this.store.files.length > 1 && isEmpty(editorView?.state)) {
      await this.discardText()
      editorView?.focus()
      return true
    } else if (this.store.collab?.started) {
      await this.discardText()
      editorView?.focus()
      return true
    } else if (isEmpty(editorView?.state)) {
      this.newFile()
      editorView?.focus()
      return true
    }

    selectAll(editorView?.state, editorView?.dispatch)
    deleteSelection(editorView?.state, editorView?.dispatch)
    editorView?.focus()
  }

  async newFile() {
    const currentFile = this.ctrl.file.currentFile
    if (isEmpty(currentFile?.editorView?.state)) {
      this.setState('args', 'dir', undefined)
      return
    }

    const state: State = unwrap(this.store)
    const file = this.ctrl.file.createFile()

    const update = this.activateFile({
      ...state,
      args: {cwd: state.args?.cwd},
      files: [...state.files, file],
    }, file)

    update.collab = this.ctrl.collab.createByFile(file)
    this.setState(update)
  }

  async openFile(req: OpenFile) {
    const state: State = unwrap(this.store)
    let file = this.ctrl.file.findFile(req)
    let text: FileText | undefined

    if (file?.path) {
      text = (await this.ctrl.file.loadFile(file.path)).text
    } else if (!file && req.path) {
      const loadedFile = await this.ctrl.file.loadFile(req.path)
      text = loadedFile.text
      file = this.ctrl.file.createFile(loadedFile)
      state.files.push(file as File)
    }

    if (!file) return
    const currentFile = this.ctrl.file.currentFile

    if (state.mode === Mode.Editor && isEmpty(currentFile?.editorView?.state)) {
      const index = this.ctrl.file.currentFileIndex
      if (index !== -1) state.files.splice(index, 1)
    }

    if (state.args?.room) state.args.room = undefined

    const update = this.activateFile(state, file)
    update.collab = this.ctrl.collab.createByFile(file)
    this.setState(update)
    if (text) this.updateText(text)
  }

  async deleteFile(req: OpenFile) {
    const currentFile = this.ctrl.file.currentFile
    if (currentFile?.id === req.id) {
      this.discardText()
      return
    }

    const state: State = unwrap(this.store)
    const files = state.files.filter((f: File) => f.id !== req.id)
    const newState = {...state, files}

    this.setState(newState)
    await db.deleteFile(req.id!)
    remote.log('info', '💾 Deleted file')
  }

  toggleMarkdown() {
    const currentFile = this.ctrl.file.currentFile
    const editorState = currentFile?.editorView?.state
    if (!editorState) return

    const markdown = !currentFile?.markdown
    let doc: any

    if (markdown) {
      const lines = serialize(editorState).split('\n')
      const nodes = lines.map((text) => {
        return text ? {type: 'paragraph', content: [{type: 'text', text}]} : {type: 'paragraph'}
      })

      doc = {type: 'doc', content: nodes}
    } else {
      const extensions = createExtensions({ctrl: this.ctrl, markdown})
      const schema = createSchema(extensions)
      const parser = createMarkdownParser(schema)
      let textContent = ''
      editorState.doc.forEach((node: Node) => {
        textContent += `${node.textContent}\n`
      })
      const text = parser.parse(textContent)
      doc = text?.toJSON()
    }

    this.ctrl.file.updateFile(currentFile!.id, {markdown})
    this.updateEditorState()

    this.updateText({...createEmptyText(), doc})
    this.ctrl.file.updateFile(currentFile!.id, {
      lastModified: new Date(),
    })

    this.saveEditor()
    remote.log('info', '💾 Toggle markdown')
  }

  updatePath(path: string) {
    const currentFile = this.ctrl.file.currentFile
    if (!currentFile?.id) return
    const lastModified = new Date()
    this.ctrl.file.updateFile(currentFile.id, {lastModified, path})
  }

  activateFile(state: State, file: File): State {
    const files = []
    for (const f of state.files) {
      const active = f.id === file.id
      f.editorView?.destroy()
      files.push({...f, active, editorView: undefined})
    }

    return {
      ...state,
      error: undefined,
      args: {...state.args, dir: undefined},
      files,
      mode: Mode.Editor,
    }
  }

  updateText(text?: {[key: string]: any}) {
    const currentFile = this.ctrl.file.currentFile
    if (!text) return
    let schema
    if (currentFile?.editorView) {
      schema = currentFile.editorView.state.schema
    } else {
      const extensions = createExtensions({
        ctrl: this.ctrl,
        markdown: currentFile?.markdown
      })
      schema = createSchema(extensions)
    }

    if (!schema || !this.store.collab?.ydoc) return
    let ynode: Node
    try {
      const json = yDocToProsemirrorJSON(this.store.collab.ydoc, currentFile?.id)
      ynode = Node.fromJSON(schema, json)
    } catch(e) {
      ynode = new Node()
    }

    const node = Node.fromJSON(schema, text.doc)
    if (!node.eq(ynode)) {
      const ydoc = prosemirrorJSONToYDoc(schema, text.doc, currentFile?.id)
      const update = Y.encodeStateAsUpdate(ydoc)
      const type = this.store.collab.ydoc.getXmlFragment(currentFile?.id)
      type.delete(0, type.length)
      Y.applyUpdate(this.store.collab.ydoc, update)
    }
  }

  async saveEditor() {
    const currentFile = this.ctrl.file.currentFile
    if (!currentFile || !currentFile?.editorView) {
      return
    }

    const file = this.ctrl.file.currentFile
    if (!file) return
    this.ctrl.file.saveFile(file)

    if (currentFile?.path) {
      const text = serialize(currentFile.editorView.state)
      await remote.writeFile(currentFile.path, text)
    }
  }

  private async discardText() {
    const currentFile = this.ctrl.file.currentFile
    const state: State = unwrap(this.store)
    const id = currentFile?.id
    const files = state.files.filter((f) => f.id !== id)
    const index = files.length - 1
    let file: File | undefined
    let text: FileText | undefined

    if (index !== -1) {
      file = this.ctrl.file.findFile({id: files[index].id})
      if (file?.path) {
        text = (await this.ctrl.file.loadFile(file.path)).text
      }
    }

    if (!file) {
      file = this.ctrl.file.createFile()
    }

    const newState = this.activateFile({
      args: {cwd: state.args?.cwd},
      ...state,
      files,
    }, file)

    newState.collab = this.ctrl.collab.createByFile(file)
    this.setState(newState)

    await db.deleteFile(id!)

    if (text) this.updateText(text)
    this.saveEditor()
  }
}
