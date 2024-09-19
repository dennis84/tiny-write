import {Store, unwrap, SetStoreFunction} from 'solid-js/store'
import {EditorView} from 'prosemirror-view'
import {EditorState, Transaction} from 'prosemirror-state'
import {selectAll, deleteSelection} from 'prosemirror-commands'
import * as Y from 'yjs'
import {prosemirrorJSONToYDoc} from 'y-prosemirror'
import {debounce} from 'throttle-debounce'
import {Box} from '@tldraw/editor'
import {debug, info, error, ropeFromString} from '@/remote'
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

  private writeFileThrottled = debounce(1000, this.writeFile.bind(this))

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
        } catch (e: any) {
          error('Sync error occurred', e)
          this.appService.setError({id: 'editor_sync', error: e})
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

        info('Saved editor content')
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
    debug(`Open file: (id=${id}, share=${share}, mode=editor)`)
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
      const subdoc = CollabService.getSubdoc(update.collab.ydoc, file.id)
      if (text) this.updateText(file, subdoc, text)
      this.setState(update)
      this.treeService.create()
    } catch (e: any) {
      this.appService.setError({error: e, fileId: id})
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

  updateText(file: File, subdoc: Y.Doc, text: FileText) {
    const ydoc = prosemirrorJSONToYDoc(schema, text.doc, file.id)
    const update = Y.encodeStateAsUpdate(ydoc)
    const type = subdoc.getXmlFragment(file.id)
    type.delete(0, type.length)
    Y.applyUpdate(subdoc, update)
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
      info('Serialize to markdown and write file')
      const text = serialize(file.editorView.state)
      await ropeFromString(file.path, text)
    }
  }
}
