import {Store, unwrap, SetStoreFunction} from 'solid-js/store'
import {v4 as uuidv4} from 'uuid'
import {EditorView} from 'prosemirror-view'
import {EditorState, Plugin, Transaction} from 'prosemirror-state'
import {Node} from 'prosemirror-model'
import {selectAll, deleteSelection} from 'prosemirror-commands'
import * as Y from 'yjs'
import {
  ySyncPluginKey,
  yDocToProsemirror,
  prosemirrorJSONToYDoc,
} from 'y-prosemirror'
import {WebsocketProvider} from 'y-websocket'
import {fromUint8Array, toUint8Array} from 'js-base64'
import {uniqueNamesGenerator, adjectives, animals} from 'unique-names-generator'
import * as remote from '@/remote'
import {createExtensions, createEmptyText, createSchema, createNodeViews} from '@/prosemirror-setup'
import {State, File, FileText} from '@/state'
import {COLLAB_URL, isTauri} from '@/env'
import {serialize, createMarkdownParser} from '@/markdown'
import {themes} from '@/config'
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
      config: state.config,
      markdown: state.editor?.markdown,
      fullscreen: state.fullscreen,
      path: state.editor?.path,
      keymap: this.ctrl.keymap.create(),
      y: state.collab?.ydoc ? {
        type: state.collab.ydoc.getXmlFragment('prosemirror'),
        provider: state.collab.provider!,
        permanentUserData: state.collab.permanentUserData!,
      } : undefined
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
        let file = await this.getFile(data, {path})
        if (!file) {
          const loadedFile = await this.ctrl.fs.loadFile(data.config, path)
          file = this.createFile(loadedFile)
          data.files.push(file as File)
        }
        data = await this.withFile(data, file)
        text = file.text
      } else if (data.args?.room) { // Join collab
        let file = await this.getFile(data, {id: data.args.room})
        if (!file) {
          file = this.createFile({id: data.args.room})
          data.files.push(file as File)
        }
        data = await this.withFile(data, file)
      } else if (data.editor?.id) { // Restore last saved file
        const file = await this.getFile(data, {id: data.editor.id})
        if (file) {
          data = await this.withFile(data, file)
          text = file.text
        } else {
          data.editor = undefined
        }
      }

      // Init from empty state or file not found
      if (!data.args?.dir && !data.editor?.id) {
        const file = this.createFile({id: data.args?.room})
        data.files.push(file)
        data = await this.withFile(data, file)
      }

      const newState: State = {
        ...state,
        ...data,
        config: {...data.config, ...this.ctrl.config.getTheme(data)},
        loading: 'initialized'
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
    const file = this.createFile()

    this.disconnectCollab(state)
    const update = await this.withFile({
      ...state,
      args: {cwd: state.args?.cwd},
      files: [...state.files, file],
    }, file)

    this.setState(update)
    this.updateEditorState(update)
  }

  async openFile(req: OpenFile) {
    const state: State = unwrap(this.store)
    let file = await this.getFile(state, req)
    if (!file && req.path) {
      const loadedFile = await this.ctrl.fs.loadFile(state.config, req.path)
      file = this.createFile(loadedFile)
      state.files.push(file as File)
    }

    if (!file) return

    if (isEmpty(state.editor?.editorView?.state)) {
      const index = state.files.findIndex((x) => x.id === state.editor?.id)
      if (index !== -1) state.files.splice(index, 1)
    }

    if (state.args?.room) state.args.room = undefined
    const update = await this.withFile(state, file)
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

  startCollab() {
    window.history.replaceState(null, '', `/${this.store.editor?.id}`)
    this.store.collab?.provider?.connect()
    this.setState('collab', {started: true})
  }

  stopCollab() {
    this.disconnectCollab(unwrap(this.store))
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
        config: state.config,
        path: state.editor?.path,
        markdown,
        keymap: this.ctrl.keymap.create(),
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

  disconnectCollab(state: State) {
    state.collab?.ydoc?.getMap('config').unobserve(this.onCollabConfigUpdate)
    state.collab?.provider?.disconnect()
    window.history.replaceState(null, '', '/')
    this.setState('collab', {started: false})
  }

  private createYdoc(bytes?: Uint8Array): Y.Doc {
    const ydoc = new Y.Doc({gc: false})
    if (bytes) Y.applyUpdate(ydoc, bytes)
    return ydoc
  }

  private createFile(params: Partial<File> = {}): File {
    const ydoc = params.ydoc ?? Y.encodeStateAsUpdate(this.createYdoc())
    return {
      markdown: false,
      ...params,
      id: params.id ?? uuidv4(),
      ydoc,
    }
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
      file = await this.getFile(state, {id: files[index].id})
    }

    if (!file) {
      file = this.createFile()
    }

    const newState = await this.withFile(state, file)
    this.setState({
      args: {cwd: state.args?.cwd},
      ...newState,
      files,
    })

    await db.deleteFile(id!)
    this.saveEditor(newState)

    this.updateEditorState(newState)
    if (file?.text) this.updateText(file.text)
  }

  private async getFile(state: State, req: OpenFile): Promise<File | undefined> {
    const index = state.files.findIndex((file) => {
      return file.id === req.id || (file.path && file.path === req.path)
    })

    if (index === -1) return

    const file = state.files[index]
    if (file?.path) {
      const loadedFile = await this.ctrl.fs.loadFile(state.config, file.path)
      file.text = loadedFile.text
      file.lastModified = loadedFile.lastModified
      file.path = loadedFile.path
    }

    return file
  }

  private async withFile(state: State, file: File): Promise<State> {
    this.disconnectCollab(state)
    return this.withYjs({
      ...state,
      error: undefined,
      args: {...state.args, dir: undefined},
      editor: {
        id: file.id!,
        editorView: state.editor?.editorView,
        path: file.path,
        lastModified: file.lastModified,
        markdown: file.markdown,
      },
      collab: {
        ydoc: this.createYdoc(file.ydoc),
      },
    })
  }

  private onCollabConfigUpdate = (event: Y.YMapEvent<unknown>) => {
    const font = event.target.get('font') as string
    const fontSize = event.target.get('fontSize') as number
    const contentWidth = event.target.get('contentWidth') as number
    this.setState('config', {font, fontSize, contentWidth})
  }

  private withYjs(state: State): State {
    let join = false
    let started = false
    let room = state.editor!.id

    if (state.args?.room) {
      started = true
      join = room !== state.args.room
      room = state.args.room
      window.history.replaceState(null, '', `/${room}`)
    }

    const ydoc = join ? this.createYdoc() : (state.collab?.ydoc ?? this.createYdoc())
    const permanentUserData = new Y.PermanentUserData(ydoc)

    const provider = new WebsocketProvider(COLLAB_URL, room, ydoc, {connect: started})
    const configType = ydoc.getMap('config')
    configType.set('font', state.config.font)
    configType.set('fontSize', state.config.fontSize)
    configType.set('contentWidth', state.config.contentWidth)
    configType.observe(this.onCollabConfigUpdate)

    provider.on('connection-error', () => {
      remote.log('ERROR', '🌐 Connection error')
      this.disconnectCollab(this.store)
    })

    const xs = Object.values(themes)
    const index = Math.floor(Math.random() * xs.length)
    const username = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      style: 'capital',
      separator: ' ',
      length: 2,
    })

    provider.awareness.setLocalStateField('user', {
      name: username,
      color: xs[index].primaryBackground,
      background: xs[index].primaryBackground,
      foreground: xs[index].primaryForeground,
    })

    const newState = {
      ...state,
      editor: {
        ...state.editor,
        id: room,
      },
      collab: {
        started,
        ydoc,
        provider,
        permanentUserData,
      }
    }

    return newState
  }

  private updateText(text?: {[key: string]: any}) {
    if (!text) return
    const schema = this.store.editor?.editorView?.state?.schema
    if (!schema || !this.store.collab?.ydoc) return
    let ynode: Node
    try {
      ynode = yDocToProsemirror(schema, this.store.collab.ydoc)
    } catch(e) {
      ynode = new Node()
    }

    const node = Node.fromJSON(schema, text.doc)
    if (!node.eq(ynode)) {
      const ydoc = prosemirrorJSONToYDoc(schema, text.doc)
      const update = Y.encodeStateAsUpdate(ydoc)
      const type = this.store.collab.ydoc.getXmlFragment('prosemirror')
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
    this.saveFile(file)

    if (state.editor?.path) {
      const text = serialize(state.editor.editorView.state)
      await remote.writeFile(state.editor.path, text)
    }

    db.setEditor(editor)
  }

  private async saveFile(file: File) {
    if (!file.lastModified) {
      return
    }

    db.updateFile({
      id: file.id,
      ydoc: fromUint8Array(file.ydoc!),
      lastModified: file.lastModified,
      path: file.path,
      markdown: file.markdown,
    })

    const files = await db.getFiles() ?? []
    db.setSize('files', JSON.stringify(files).length)
  }

  private async fetchFiles() {
    const fetched = await db.getFiles()
    const files = []

    for (const file of fetched ?? []) {
      try {
        files.push({
          id: file.id,
          ydoc: toUint8Array(file.ydoc),
          lastModified: new Date(file.lastModified),
          path: file.path,
          markdown: file.markdown,
        })
      } catch (err) {
        remote.log('ERROR', 'Ignore file due to invalid ydoc.')
      }
    }

    return files
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
    const files = await this.fetchFiles()

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
