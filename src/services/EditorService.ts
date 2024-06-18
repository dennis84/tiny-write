import {Store, unwrap, SetStoreFunction} from 'solid-js/store'
import {EditorView} from 'prosemirror-view'
import {EditorState, Transaction} from 'prosemirror-state'
import {Node} from 'prosemirror-model'
import {selectAll, deleteSelection} from 'prosemirror-commands'
import * as Y from 'yjs'
import {
  ySyncPluginKey,
  prosemirrorJSONToYDoc,
  yXmlFragmentToProseMirrorRootNode,
} from 'y-prosemirror'
import {Box} from '@tldraw/editor'
import * as remote from '@/remote'
import {State, FileText, File} from '@/state'
import {serialize} from '@/markdown'
import {Ctrl} from '.'
import {FileService} from './FileService'
import {CollabService} from './CollabService'
import {ProseMirrorService, schema} from './ProseMirrorService'

export class EditorService {
  constructor(
    private ctrl: Ctrl,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  updateEditorState(file: File, node?: Element) {
    let editorView = file.editorView

    if ((!editorView && !node) || !file?.id) {
      return
    }

    const ydoc = this.store.collab?.snapshot ?? this.store.collab?.ydoc
    if (!ydoc) return // If error during init

    const type = ydoc.getXmlFragment(file.id)
    const {plugins, doc} = ProseMirrorService.createPlugins({
      ctrl: this.ctrl,
      type,
      dropCursor: true,
    })

    const {nodeViews} = ProseMirrorService.createNodeViews(this.ctrl)
    const editorState = EditorState.create({doc, schema, plugins})

    if (!editorView) {
      const dispatchTransaction = (tr: Transaction) => {
        if (editorView?.isDestroyed) return

        const newState = editorView!.state.apply(tr)
        try {
          editorView!.updateState(newState)
        } catch (error: any) {
          remote.error('Sync error occurred', error)
          this.ctrl.app.setError({id: 'editor_sync', error})
          return
        }

        this.setState('lastTr', tr.time)
        if (!tr.docChanged) return

        const yMeta = tr.getMeta(ySyncPluginKey)
        const maybeSkip = tr.getMeta('addToHistory') === false
        const isUndo = yMeta?.isUndoRedoOperation

        if ((maybeSkip && !isUndo) || this.store.isSnapshot) return

        this.ctrl.file.updateFile(file.id, {
          lastModified: new Date(),
        })

        const updatedFile = this.ctrl.file.findFileById(file.id)
        if (!updatedFile) return
        void FileService.saveFile(updatedFile)
        remote.info('Saved editor content')
      }

      editorView = new EditorView(node!, {
        state: editorState,
        nodeViews,
        dispatchTransaction,
        editable: () => !this.ctrl.collab.isSnapshot,
      })

      const fileIndex = this.store.files.findIndex((f) => f.id === file.id)
      this.setState('files', fileIndex, 'editorView', editorView)
    }

    editorView.setProps({state: editorState, nodeViews})
  }

  renderEditor(id: string, node: Element) {
    let file = this.ctrl.file.findFileById(id)

    if (!file) {
      file = FileService.createFile({id})
      this.setState('files', (prev) => [...prev, file!])
    }

    if (!file?.path) {
      this.ctrl.collab.apply(file)
    }

    this.updateEditorState(file, node)
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
    const file = FileService.createFile()

    const update = await FileService.activateFile({
      ...state,
      args: {cwd: state.args?.cwd},
      files: [...state.files, file],
    }, file)

    update.collab = CollabService.create(file.id, state.mode, false)
    this.setState(update)
    this.ctrl.collab.init()
  }

  async openFileByPath(path: string) {
    remote.debug(`Open file by path: ${path}`)
    let file
    try {
      file = await this.ctrl.file.findFileByPath(path)
    } catch (error: any) {
      this.ctrl.app.setError({error, fileId: file?.id})
      return
    }

    if (file) {
      await this.openFile(file.id)
      this.ctrl.file.updateFile(file.id, {deleted: false})
    } else {
      remote.debug(`Create new file by path: ${path}`)
      const file = FileService.createFile({path})
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
        text = (await FileService.loadMarkdownFile(file.path)).text
      }

      if (!file) return
      if (state.args?.room) state.args.room = undefined

      const update = await FileService.activateFile(state, file)
      update.collab = CollabService.create(file.id, update.mode, false)
      this.setState(update)
      this.ctrl.collab.init()
      this.ctrl.tree.create()
      if (text) this.updateText(text)
    } catch (error: any) {
      this.ctrl.app.setError({error, fileId: id})
    }
  }

  async updatePath(path: string) {
    const currentFile = this.ctrl.file.currentFile
    if (!currentFile?.id) return
    const lastModified = new Date()
    this.ctrl.file.updateFile(currentFile.id, {lastModified, path})
    await this.saveEditor()
  }

  updateText(text?: FileText) {
    const currentFile = this.ctrl.file.currentFile
    if (!text || !currentFile) return
    if (!this.store.collab?.ydoc) {
      return
    }

    let ynode: Node
    try {
      const type = this.store.collab.ydoc.getXmlFragment(currentFile.id)
      const json = yXmlFragmentToProseMirrorRootNode(type, schema)
      ynode = Node.fromJSON(schema, json)
    } catch(_e) {
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
    await FileService.saveFile(file)

    if (currentFile?.path) {
      const text = serialize(currentFile.editorView.state)
      await remote.writeFile(currentFile.path, text)
    }
  }

  selectBox(box: Box, first: boolean, last: boolean) {
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
