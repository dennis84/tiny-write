import type {Box} from '@flatten-js/core'
import {debounce} from '@solid-primitives/scheduled'
import {deleteSelection, selectAll} from 'prosemirror-commands'
import {EditorState, type Transaction} from 'prosemirror-state'
import {EditorView} from 'prosemirror-view'
import type {SetStoreFunction, Store} from 'solid-js/store'
import {prosemirrorJSONToYDoc} from 'y-prosemirror'
import * as Y from 'yjs'
import {serialize} from '@/prosemirror/markdown-serialize'
import {schema} from '@/prosemirror/schema'
import {replaceText, writeFile} from '@/remote/editor'
import {error, info} from '@/remote/log'
import {type File, type FileText, Page, type State} from '@/state'
import type {AppService} from './AppService'
import type {CollabService} from './CollabService'
import {FileService} from './FileService'
import type {ProseMirrorService} from './ProseMirrorService'
import type {SelectService} from './SelectService'

export class EditorService {
  constructor(
    private fileService: FileService,
    private collabService: CollabService,
    private proseMirrorService: ProseMirrorService,
    private appService: AppService,
    private selectService: SelectService,
    private store: Store<State>,
    private setState: SetStoreFunction<State>,
  ) {}

  private writeFileThrottled = debounce(this.writeFile.bind(this), 1000)

  updateConfig(file: File) {
    this.updateEditorState(file)
  }

  updateEditorState(file: File, node?: Element) {
    info('Update editor state')

    let editorView = file.editorView

    if ((!editorView && !node) || !file?.id) {
      return
    }

    const snapshot = this.store.location?.snapshot
    let subdoc: Y.Doc
    if (snapshot !== undefined) {
      subdoc = new Y.Doc({gc: false})
      const version = file.versions[snapshot]
      Y.applyUpdate(subdoc, version.ydoc)
    } else {
      subdoc = this.collabService.getSubdoc(file.id)
    }

    const type = subdoc.getXmlFragment(file.id)
    const awareness = this.collabService.getProvider(file.id)?.awareness

    if (!awareness) {
      return
    }

    const {plugins, doc} = this.proseMirrorService.createPlugins({
      awareness,
      type,
      dropCursor: true,
    })

    const {nodeViews} = this.proseMirrorService.createNodeViews()
    const editorState = EditorState.create({doc, schema, plugins})

    if (!editorView) {
      const dispatchTransaction = async (tr: Transaction) => {
        if (!editorView) return
        if (editorView?.isDestroyed) return
        // selection is deleted after dragstart
        if (editorView?.dragging) return

        const newState = editorView.state.apply(tr)
        try {
          editorView?.updateState(newState)
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
          ydoc: Y.encodeStateAsUpdate(subdoc),
        })

        const updatedFile = this.fileService.findFileById(file.id)
        if (!updatedFile) return

        await FileService.saveFile(file)
        this.writeFileThrottled(file)

        info('Saved editor content')
      }

      if (!node) return

      editorView = new EditorView(node, {
        state: editorState,
        nodeViews,
        dispatchTransaction,
        editable: () => this.store.location?.snapshot === undefined,
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

  async init(id: string, existingYdoc?: Y.Doc) {
    const file = this.fileService.findFileById(id)
    const share = this.store.location?.share

    info(`Initialize editor file (id=${id}, share=${share})`)

    const path = file?.path
    let text: FileText | undefined

    if (!file) {
      throw new Error(`File not found (id=${id})`)
    }

    if (file.code) {
      throw new Error(`File aready exists of type code (id=${id})`)
    }

    if (path) {
      text = (await FileService.loadMarkdownFile(path)).text
    }

    if (!existingYdoc) {
      this.collabService.init(file.id, Page.Editor, share)
    }

    this.collabService.createSubdocProvider(id)
    info(`Provider created sucessfully`)

    if (file.ydoc) {
      const subdoc = this.collabService.getSubdoc(file.id)
      info('Update editor state from existing file ydoc')
      Y.applyUpdate(subdoc, file.ydoc)
    }

    // Replace ydoc state with file content
    if (text) {
      const subdoc = this.collabService.getSubdoc(file.id)
      info('Update editor text from file')
      this.updateText(file, subdoc, text)
    }

    if (!existingYdoc) {
      this.collabService.registerListeners()
    }

    this.collabService.addToScope(file)

    if (share) {
      this.collabService.connect(id)
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
      await replaceText(file.path, {text})
      await writeFile(file.path)
    }
  }
}
