import {Store, unwrap, SetStoreFunction} from 'solid-js/store'
import {EditorView} from 'prosemirror-view'
import {EditorState, Transaction} from 'prosemirror-state'
import {Node} from 'prosemirror-model'
import {selectAll, deleteSelection} from 'prosemirror-commands'
import * as Y from 'yjs'
import {prosemirrorJSONToYDoc, yXmlFragmentToProseMirrorRootNode} from 'y-prosemirror'
import {throttle} from 'throttle-debounce'
import {Box} from '@tldraw/editor'
import * as remote from '@/remote'
import {State, FileText, File} from '@/state'
import {serialize} from '@/markdown'
import {FileService} from './FileService'
import {CollabService} from './CollabService'
import {ProseMirrorService, schema} from './ProseMirrorService'
import {AppService} from './AppService'
import {TreeService} from './TreeService'
import {SelectService} from './SelectService'

export class EditorService {
  constructor(
    private fileService: FileService,
    private collabService: CollabService,
    private proseMirrorService: ProseMirrorService,
    private appService: AppService,
    private treeService: TreeService,
    private selectService: SelectService,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  private writeFileThrottled = throttle(1000, this.writeFile.bind(this))

  updateConfig(file: File) {
    this.updateEditorState(file)
  }

  updateEditorState(file: File, node?: Element) {
    let editorView = file.editorView

    if ((!editorView && !node) || !file?.id) {
      return
    }

    const subdoc = this.store.collab?.snapshot ?? this.collabService.getSubdoc(file.id)
    const type = subdoc.getXmlFragment(file.id)

    const {plugins, doc} = this.proseMirrorService.createPlugins({
      type,
      dropCursor: true,
    })

    const {nodeViews} = this.proseMirrorService.createNodeViews()
    const editorState = EditorState.create({doc, schema, plugins})

    if (!editorView) {
      const dispatchTransaction = async (tr: Transaction) => {
        if (editorView?.isDestroyed) return
        // selection is deleted after dragstart
        if (editorView?.dragging) return

        const newState = editorView!.state.apply(tr)
        try {
          editorView!.updateState(newState)
        } catch (error: any) {
          remote.error('Sync error occurred', error)
          this.appService.setError({id: 'editor_sync', error})
          return
        }

        this.setState('lastTr', tr.time)
        if (!tr.docChanged) return

        if (this.store.isSnapshot) return

        this.fileService.updateFile(file.id, {
          lastModified: new Date(),
        })

        const updatedFile = this.fileService.findFileById(file.id)
        if (!updatedFile) return

        await FileService.saveFile(file)
        this.writeFileThrottled(file)

        remote.info('Saved editor content')
      }

      editorView = new EditorView(node!, {
        state: editorState,
        nodeViews,
        dispatchTransaction,
        editable: () => !this.collabService.isSnapshot,
      })

      const fileIndex = this.store.files.findIndex((f) => f.id === file.id)
      this.setState('files', fileIndex, 'editorView', editorView)
    }

    editorView.setProps({state: editorState, nodeViews})
  }

  renderEditor(file: File, node: Element) {
    this.updateEditorState(file, node)
  }

  async clear() {
    const currentFile = this.fileService.currentFile
    const editorView = currentFile?.editorView
    if (!editorView) return

    selectAll(editorView?.state, editorView?.dispatch)
    deleteSelection(editorView?.state, editorView?.dispatch)
    editorView?.focus()
  }

  async newFile(params: Partial<File> = {}): Promise<File> {
    const file = FileService.createFile(params)
    this.setState('files', (prev) => [...prev, file])
    return file
  }

  async openFile(id: string, share = false) {
    remote.debug(`Open file: (id=${id}, share=${share}, mode=editor)`)
    const state: State = unwrap(this.store)

    try {
      let file = this.fileService.findFileById(id)
      let text: FileText | undefined

      if (!file) {
        file = FileService.createFile({id})
        state.files.push(file)
      }

      if (file?.path) {
        text = (await FileService.loadMarkdownFile(file.path)).text
      }

      if (state.args?.room) state.args.room = undefined

      const update = await FileService.activateFile(state, file)
      update.collab = CollabService.create(file.id, update.mode, share)
      this.setState(update)
      this.treeService.create()
      if (text) this.updateText(text)
    } catch (error: any) {
      this.appService.setError({error, fileId: id})
    }
  }

  async updatePath(path: string) {
    const currentFile = this.fileService.currentFile
    if (!currentFile?.id) return
    const lastModified = new Date()
    this.fileService.updateFile(currentFile.id, {lastModified, path})

    const updatedFile = this.fileService.currentFile
    if (!updatedFile) return
    await FileService.saveFile(updatedFile)
    await this.writeFile(updatedFile)
  }

  updateText(text?: FileText) {
    const currentFile = this.fileService.currentFile
    if (!text || !currentFile) return
    if (!this.store.collab?.ydoc) {
      return
    }

    let ynode: Node
    try {
      const subdoc = this.collabService.getSubdoc(currentFile.id)
      const type = subdoc.getXmlFragment(currentFile.id)
      const json = yXmlFragmentToProseMirrorRootNode(type, schema)
      ynode = Node.fromJSON(schema, json)
    } catch (_e) {
      ynode = new Node()
    }

    const node = Node.fromJSON(schema, text.doc)
    if (!node.eq(ynode)) {
      const ydoc = prosemirrorJSONToYDoc(schema, text.doc, currentFile.id)
      const update = Y.encodeStateAsUpdate(ydoc)
      const subdoc = this.collabService.getSubdoc(currentFile.id)
      const type = subdoc.getXmlFragment(currentFile.id)
      type.delete(0, type.length)
      Y.applyUpdate(subdoc, update)
    }
  }

  selectBox(box: Box, first: boolean, last: boolean) {
    const currentFile = this.fileService.currentFile
    const editorView = currentFile?.editorView
    if (!editorView) return
    this.selectService.selectBox(box, editorView, first, last)
  }

  deselect() {
    const currentFile = this.fileService.currentFile
    const editorView = currentFile?.editorView
    if (!editorView) return
    this.selectService.deselect(editorView)
  }

  async writeFile(file: File) {
    if (file?.path && file.editorView) {
      remote.info('Write file')
      const text = serialize(file.editorView.state)
      await remote.writeFile(file.path, text)
    }
  }
}
