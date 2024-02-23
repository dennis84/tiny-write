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
import {Box2d} from '@tldraw/primitives'
import * as remote from '@/remote'
import {createExtensions, createEmptyText, createSchema, createNodeViews} from '@/prosemirror-setup'
import {State, File, FileText, Mode} from '@/state'
import {serialize, createMarkdownParser} from '@/markdown'
import {DB} from '@/db'
import {Ctrl} from '.'

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

    const doc = this.store.collab?.snapshot ?? this.store.collab?.ydoc
    if (!doc) return // If error during init

    const type = doc.getXmlFragment(currentFile.id)
    const extensions = createExtensions({
      ctrl: this.ctrl,
      markdown: currentFile?.markdown,
      type,
      dropcursor: true,
    })

    const nodeViews = createNodeViews(extensions)
    const schema = createSchema(extensions)
    const plugins = extensions.reduce<Plugin[]>((acc, e) => e.plugins?.(acc, schema) ?? acc, [])
    const editorState = EditorState.fromJSON({schema, plugins}, createEmptyText())

    if (!editorView) {
      const dispatchTransaction = (tr: Transaction) => {
        const newState = editorView!.state.apply(tr)
        editorView!.updateState(newState)
        this.setState('lastTr', tr.time)
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
        remote.info('💾 Saved updated text')
      }

      editorView = new EditorView(node!, {
        state: editorState,
        nodeViews,
        dispatchTransaction,
        editable: () => !this.ctrl.collab.isSnapshot,
      })

      const currentFileIndex = this.ctrl.file.currentFileIndex
      this.setState('files', currentFileIndex, 'editorView', editorView)
    }

    editorView.setProps({state: editorState, nodeViews})
    editorView.focus()
  }

  renderEditor(node: Element) {
    const currentFile = this.ctrl.file.currentFile
    if (!currentFile?.path && currentFile?.ydoc) {
      this.ctrl.collab.apply(currentFile)
    }

    this.updateEditorState(node)
  }

  async clear() {
    const currentFile = this.ctrl.file.currentFile
    const editorView = currentFile?.editorView
    if (!editorView) return

    selectAll(editorView?.state, editorView?.dispatch)
    deleteSelection(editorView?.state, editorView?.dispatch)
    editorView?.focus()
  }

  async newFile() {
    const state: State = unwrap(this.store)
    const file = this.ctrl.file.createFile()

    const update = await this.activateFile({
      ...state,
      args: {cwd: state.args?.cwd},
      files: [...state.files, file],
    }, file)

    update.collab = this.ctrl.collab.create(file.id, state.mode, false)
    this.setState(update)
  }

  async openFileByPath(path: string) {
    remote.debug(`Open file by path: ${path}`)
    const file = await this.ctrl.file.findFileByPath(path)

    if (file) {
      await this.openFile(file.id)
    } else {
      remote.debug(`Create new file by path: ${path}`)
      const file = this.ctrl.file.createFile({path})
      this.setState('files', (prev) => [...prev, file])
      await this.openFile(file.id)
    }
  }

  async openFile(id: string) {
    remote.debug(`Open file: ${id}`)
    const state: State = unwrap(this.store)

    try {
      const file = this.ctrl.file.findFileById(id)
      let text: FileText | undefined

      if (file?.path) {
        text = (await this.ctrl.file.loadFile(file.path)).text
      }

      if (!file) return
      if (state.args?.room) state.args.room = undefined

      const update = await this.activateFile(state, file)
      update.collab = this.ctrl.collab.create(file.id, state.mode, false)
      this.setState(update)
      if (text) this.updateText(text)
    } catch (e: any) {
      this.ctrl.app.setError(e)
    }
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
    remote.info('💾 Toggle markdown')
  }

  updatePath(path: string) {
    const currentFile = this.ctrl.file.currentFile
    if (!currentFile?.id) return
    const lastModified = new Date()
    this.ctrl.file.updateFile(currentFile.id, {lastModified, path})
    this.saveEditor()
  }

  async activateFile(state: State, file: File): Promise<State> {
    const files = []

    for (const f of state.files) {
      f.editorView?.destroy()
      const active = f.id === file.id
      const newFile = {...f, active, editorView: undefined}
      files.push(newFile)
      if (active || f.active) {
        await this.ctrl.file.saveFile(newFile)
      }
    }

    const mode = Mode.Editor
    DB.setMeta({mode})

    return {
      ...state,
      error: undefined,
      args: {...state.args, dir: undefined},
      files,
      mode,
    }
  }

  updateText(text?: {[key: string]: any}) {
    const currentFile = this.ctrl.file.currentFile
    if (!text || !currentFile) return
    let schema
    if (currentFile.editorView) {
      schema = currentFile.editorView.state.schema
    } else {
      const extensions = createExtensions({
        ctrl: this.ctrl,
        markdown: currentFile?.markdown
      })
      schema = createSchema(extensions)
    }

    if (!schema || !this.store.collab?.ydoc) {
      return
    }

    let ynode: Node
    try {
      const json = yDocToProsemirrorJSON(this.store.collab.ydoc, currentFile.id)
      ynode = Node.fromJSON(schema, json)
    } catch(e) {
      ynode = new Node()
    }

    const node = Node.fromJSON(schema, text.doc)
    if (!node.eq(ynode)) {
      const ydoc = prosemirrorJSONToYDoc(schema, text.doc, currentFile.id)
      const update = Y.encodeStateAsUpdate(ydoc)
      const type = this.store.collab.ydoc.getXmlFragment(currentFile.id)
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

  selectBox(box: Box2d, first: boolean, last: boolean) {
    const currentFile = this.ctrl.file.currentFile
    const editorView = currentFile?.editorView
    if (!editorView) return
    this.ctrl.select.selectBox(box, editorView, first, last)
  }

  deselect() {
    const currentFile = this.ctrl.file.currentFile
    const editorView = currentFile?.editorView
    if (!editorView) return
    this.ctrl.select.deselect(editorView)
  }
}
