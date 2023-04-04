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
import {isTauri} from '@/env'
import {serialize, createMarkdownParser} from '@/markdown'
import {isEmpty} from '@/prosemirror'
import * as db from '@/db'
import {Ctrl} from '.'

type OpenFile = {id?: string; path?: string}

export class EditorService {
  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  updateEditorState(state: State, node?: Element) {
    let editorView = state.editor?.editorView

    if ((!editorView && !node) || !state.editor?.id) {
      return
    }

    const extensions = createExtensions({
      state,
      type: state.collab!.ydoc!.getXmlFragment(this.store.editor?.id),
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

        this.setState('editor', 'lastModified', new Date())
        this.updateCurrentFile()
        this.saveEditor(this.store)
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

  async init(node: Element) {
    const state = unwrap(this.store)

    try {
      let data = await this.fetchData(state)
      let text: FileText | undefined

      if (isTauri && data.window) {
        await remote.updateWindow(data.window)
      }

      if (data.args?.dir) { // If app was started with a directory as argument
        data.editor = undefined
      } else if (data.args?.file) { // If app was started with a file as argument
        const path = data.args.file
        let file = await this.ctrl.file.getFile(data, {path})
        if (!file) {
          const loadedFile = await this.ctrl.file.loadFile(path)
          file = this.ctrl.file.createFile(loadedFile)
          data.files.push(file as File)
        }
        data = this.withFile(data, file)
        text = file.text
      } else if (data.args?.room) { // Join collab
        let file = await this.ctrl.file.getFile(data, {id: data.args.room})
        if (!file) {
          file = this.ctrl.file.createFile({id: data.args.room})
          data.files.push(file as File)
        }
        data = this.withFile(data, file)
      } else if (data.editor?.id) { // Restore last saved file
        const file = await this.ctrl.file.getFile(data, {id: data.editor.id})
        if (file) {
          data = this.withFile(data, file)
          text = file.text
        } else {
          data.editor = undefined
        }
      }

      // Init from empty state or file not found
      if (!data.args?.dir && !data.editor?.id) {
        const file = this.ctrl.file.createFile({id: data.args?.room})
        data.files.push(file)
        data = this.withFile(data, file)
      }

      let collab
      if (data.editor?.id) {
        collab = this.ctrl.collab.create(data.editor.id, data.args?.room)
        const file = await this.ctrl.file.getFile(data, {id: data.editor.id})
        if (file) this.ctrl.collab.applyTo(file, collab.ydoc)
      }

      const newState: State = {
        ...state,
        ...data,
        config: {...data.config, ...this.ctrl.config.getTheme(data)},
        loading: 'initialized',
        collab,
      }

      if (isTauri && newState.config?.alwaysOnTop) {
        await remote.setAlwaysOnTop(true)
      }

      this.setState(newState)
      this.renderEditor(node)
      this.updateText(text)
    } catch (error: any) {
      remote.log('error', `Error during init: ${error.message}`)
      this.ctrl.app.setError(error)
    }

    if (isTauri) {
      await remote.show()
    }
  }

  renderEditor(node: Element) {
    this.updateEditorState(unwrap(this.store), node)
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
    } else if (this.store.editor?.path) {
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

    this.ctrl.collab.disconnectCollab(state)
    const update = this.withFile({
      ...state,
      args: {cwd: state.args?.cwd},
      files: [...state.files, file],
    }, file)

    this.ctrl.collab.apply(file)
    this.setState(update)
    this.updateEditorState(update)
  }

  async openFile(req: OpenFile) {
    const state: State = unwrap(this.store)
    let file = await this.ctrl.file.getFile(state, req)
    if (!file && req.path) {
      const loadedFile = await this.ctrl.file.loadFile(req.path)
      file = this.ctrl.file.createFile(loadedFile)
      state.files.push(file as File)
    }

    if (!file) return

    if (isEmpty(state.editor?.editorView?.state)) {
      const index = state.files.findIndex((x) => x.id === state.editor?.id)
      if (index !== -1) state.files.splice(index, 1)
    }

    if (state.args?.room) state.args.room = undefined
    this.ctrl.collab.disconnectCollab(state)
    const update = this.withFile(state, file)
    this.ctrl.collab.apply(file)
    this.setState(update)
    this.updateEditorState(update)
    if (file.text) this.updateText(file.text)
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
    const state: State = unwrap(this.store)
    const editorState = state.editor?.editorView?.state
    if (!editorState) return

    const markdown = !state.editor?.markdown
    let doc: any

    if (markdown) {
      const lines = serialize(editorState).split('\n')
      const nodes = lines.map((text) => {
        return text ? {type: 'paragraph', content: [{type: 'text', text}]} : {type: 'paragraph'}
      })

      doc = {type: 'doc', content: nodes}
    } else {
      const extensions = createExtensions({
        state,
        markdown,
        keymap: this.ctrl.keymap.create(),
        type: state.collab!.ydoc!.getXmlFragment(this.store.editor?.id),
      })
      const schema = createSchema(extensions)
      const parser = createMarkdownParser(schema)
      let textContent = ''
      editorState.doc.forEach((node: Node) => {
        textContent += `${node.textContent}\n`
      })
      const text = parser.parse(textContent)
      doc = text?.toJSON()
    }

    const lastModified = new Date()
    this.setState('editor', (prev) => ({...prev, markdown, lastModified}))
    this.updateEditorState(this.store)
    this.updateText({...createEmptyText(), doc})
    this.updateCurrentFile()
    this.saveEditor(this.store)
    remote.log('info', '💾 Toggle markdown')
  }

  updatePath(path: string) {
    this.setState('editor', 'path', path)
    this.updateCurrentFile()
  }

  private updateCurrentFile() {
    const state = unwrap(this.store)
    if (!state.editor || !state.collab?.ydoc) return
    const index = this.store.files.findIndex((f) => f.id === state.editor?.id)
    if (index === -1) return
    this.setState('files', index, {
      lastModified: state.editor.lastModified,
      markdown: state.editor.markdown,
      path: state.editor.path,
      ydoc: Y.encodeStateAsUpdate(state.collab.ydoc),
    })
  }

  private async discardText() {
    const state: State = unwrap(this.store)
    const id = state.editor?.id
    const files = state.files.filter((f) => f.id !== id)
    const index = files.length - 1
    let file: File | undefined

    if (index !== -1) {
      file = await this.ctrl.file.getFile(state, {id: files[index].id})
    }

    if (!file) {
      file = this.ctrl.file.createFile()
    }

    this.ctrl.collab.disconnectCollab(state)
    const newState = this.withFile(state, file)
    this.setState({
      args: {cwd: state.args?.cwd},
      ...newState,
      files,
    })

    await db.deleteFile(id!)
    this.saveEditor(newState)

    this.ctrl.collab.apply(file)
    this.updateEditorState(newState)
    if (file?.text) this.updateText(file.text)
  }

  private withFile(state: State, file: File): State {
    return {
      ...state,
      error: undefined,
      args: {...state.args, dir: undefined},
      editor: {
        id: file.id!,
        editorView: state.editor?.editorView,
        path: file.path,
        lastModified: file.lastModified,
        markdown: file.markdown,
      }
    }
  }

  private updateText(text?: {[key: string]: any}) {
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

  async saveEditor(state: State) {
    if (!state.editor?.id || !state.editor?.editorView) {
      return
    }

    const editor = {id: state.editor.id}
    const file = state.files.find((f) => f.id === editor.id)
    if (!file) return
    this.ctrl.file.saveFile(file)

    if (state.editor?.path) {
      const text = serialize(state.editor.editorView.state)
      await remote.writeFile(state.editor.path, text)
    }

    db.setEditor(editor)
  }

  private async fetchData(state: State): Promise<State> {
    let args = await remote.getArgs().catch(() => undefined)

    if (!isTauri) {
      const room = window.location.pathname?.slice(1).trim()
      if (room) args = {room}
    }

    const fetchedEditor = await db.getEditor()
    const fetchedWindow = await db.getWindow()
    const fetchedConfig = await db.getConfig()
    const fetchedSize = await db.getSize()
    const files = await this.ctrl.file.fetchFiles()

    const config = {
      ...state.config,
      ...fetchedConfig,
    }

    return {
      ...state,
      args: args ?? state.args,
      editor: fetchedEditor,
      files,
      config,
      window: fetchedWindow,
      storageSize: fetchedSize ?? 0,
      collab: undefined,
    }
  }
}
