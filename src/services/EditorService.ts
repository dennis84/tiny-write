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
import {State, File, FileText} from '@/state'
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

  get currentFile(): File | undefined {
    return this.ctrl.file.findFile({id: this.store.editor?.id})
  }

  updateEditorState(node?: Element) {
    let editorView = this.store.editor?.editorView
    const id = this.store.editor?.id

    if ((!editorView && !node) || !id) {
      return
    }

    const file = this.ctrl.file.findFile({id})
    if (!file) return

    const extensions = createExtensions({
      ctrl: this.ctrl,
      markdown: file?.markdown,
      type: this.store.collab!.ydoc!.getXmlFragment(id),
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

        if ((maybeSkip && !isUndo) || this.store.isSnapshot) return
        if (!this.store.editor?.id) return

        this.ctrl.file.updateFile(this.store.editor.id, {
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

      this.setState('editor', (prev) => ({...prev, editorView}))
    }

    editorView.setProps({state: editorState, nodeViews})
    editorView.focus()
  }

  renderEditor(node: Element) {
    this.updateEditorState(node)
  }

  async discard() {
    const editorView = this.store.editor?.editorView
    if (!editorView) return

    if (this.store.error) {
      if (this.store.editor?.id) {
        await this.deleteFile({id: this.store.editor.id})
      }

      this.setState({
        ...unwrap(this.store),
        error: undefined,
        editor: undefined,
      })
      return true
    } else if (this.currentFile?.path) {
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
    if (isEmpty(this.store.editor?.editorView?.state)) {
      this.setState('args', 'dir', undefined)
      return
    }

    const state: State = unwrap(this.store)
    const file = this.ctrl.file.createFile()

    const update = this.withFile({
      ...state,
      args: {cwd: state.args?.cwd},
      files: [...state.files, file],
    }, file)

    update.collab = this.ctrl.collab.createByFile(file)
    this.setState(update)
    this.updateEditorState()
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

    if (isEmpty(state.editor?.editorView?.state)) {
      const index = state.files.findIndex((x) => x.id === state.editor?.id)
      if (index !== -1) state.files.splice(index, 1)
    }

    if (state.args?.room) state.args.room = undefined
    const update = this.withFile(state, file)
    update.collab = this.ctrl.collab.createByFile(file)
    this.setState(update)
    this.updateEditorState()
    if (text) this.updateText(text)
  }

  async deleteFile(req: OpenFile) {
    if (this.store.editor?.id === req.id) {
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
    const editorState = this.store.editor?.editorView?.state
    if (!editorState) return

    const markdown = !this.currentFile?.markdown
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

    this.ctrl.file.updateFile(this.store.editor!.id, {markdown})
    this.updateEditorState()
    this.updateText({...createEmptyText(), doc})
    this.ctrl.file.updateFile(this.store.editor!.id, {
      lastModified: new Date(),
    })

    this.saveEditor()
    remote.log('info', '💾 Toggle markdown')
  }

  updatePath(path: string) {
    if (!this.store.editor?.id) return
    const lastModified = new Date()
    this.ctrl.file.updateFile(this.store.editor.id, {lastModified, path})
  }

  private async discardText() {
    const state: State = unwrap(this.store)
    const id = state.editor?.id
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

    const newState = this.withFile(state, file)
    newState.collab = this.ctrl.collab.createByFile(file)
    this.setState({
      args: {cwd: state.args?.cwd},
      ...newState,
      files,
    })

    await db.deleteFile(id!)

    this.updateEditorState()
    if (text) this.updateText(text)
    this.saveEditor()
  }

  withFile(state: State, file: File): State {
    return {
      ...state,
      error: undefined,
      args: {...state.args, dir: undefined},
      editor: {
        id: file.id!,
        editorView: state.editor?.editorView,
      }
    }
  }

  updateText(text?: {[key: string]: any}) {
    if (!text) return
    const schema = this.store.editor?.editorView?.state?.schema
    if (!schema || !this.store.collab?.ydoc) return
    let ynode: Node
    try {
      const json = yDocToProsemirrorJSON(this.store.collab.ydoc, this.store.editor?.id)
      ynode = Node.fromJSON(schema, json)
    } catch(e) {
      ynode = new Node()
    }

    const node = Node.fromJSON(schema, text.doc)
    if (!node.eq(ynode)) {
      const ydoc = prosemirrorJSONToYDoc(schema, text.doc, this.store.editor?.id)
      const update = Y.encodeStateAsUpdate(ydoc)
      const type = this.store.collab.ydoc.getXmlFragment(this.store.editor?.id)
      type.delete(0, type.length)
      Y.applyUpdate(this.store.collab.ydoc, update)
    }
  }

  async saveEditor() {
    if (!this.currentFile || !this.store.editor?.editorView) {
      return
    }

    const editor = {id: this.store.editor.id}
    const file = this.ctrl.file.findFile({id: editor.id})
    if (!file) return
    this.ctrl.file.saveFile(file)

    if (this.currentFile?.path) {
      const text = serialize(this.store.editor.editorView.state)
      await remote.writeFile(this.currentFile.path, text)
    }

    db.setEditor(editor)
  }
}
