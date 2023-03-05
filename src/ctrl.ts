import {createSignal} from 'solid-js'
import {Store, createStore, unwrap} from 'solid-js/store'
import {v4 as uuidv4} from 'uuid'
import {EditorView} from 'prosemirror-view'
import {EditorState, Plugin, Transaction} from 'prosemirror-state'
import {Node, Slice} from 'prosemirror-model'
import {selectAll, deleteSelection} from 'prosemirror-commands'
import * as Y from 'yjs'
import {
  undo,
  redo,
  ySyncPluginKey,
  yDocToProsemirror,
  prosemirrorJSONToYDoc,
} from 'y-prosemirror'
import {WebsocketProvider} from 'y-websocket'
import {uniqueNamesGenerator, adjectives, animals} from 'unique-names-generator'
import * as db from '@/db'
import * as remote from '@/remote'
import {createExtensions, createEmptyText, createSchema, createNodeViews} from '@/prosemirror-setup'
import {State, File, Config, Version, ServiceError, createState, Window, FileText} from '@/state'
import {COLLAB_URL, isTauri, mod} from '@/env'
import {serialize, createMarkdownParser} from '@/markdown'
import {isDarkTheme, themes} from '@/config'
import {isEmpty} from '@/prosemirror'
import {loadFile} from '@/fs'
import {fetchData, saveConfig, saveEditor, saveWindow} from '@/service'

type OpenFile = {id?: string; path?: string}

export const createCtrl = (initial: State) => {
  const [store, setState] = createStore<Store<State>>(initial)
  const [snapshotView, setSnapshotView] = createSignal(false)

  const onReload = () => {
    if (!isTauri) return
    window.location.reload()
  }

  const onQuit = () => {
    if (!isTauri) return
    remote.quit()
  }

  const onNew = () => {
    newFile()
    return true
  }

  const onDiscard = () => {
    discard()
    return true
  }

  const onSave = async () => {
    const state = store.editor?.editorView?.state
    if (!isTauri || store.editor?.path || !state) return false
    const path = await remote.save(state)
    if (path) ctrl.updatePath(path)
  }

  const onFullscreen = () => {
    if (!isTauri) return
    ctrl.setFullscreen(!store.fullscreen)
    return true
  }

  const onUndo = () => {
    if (!store.editor?.editorView) return
    undo(store.editor.editorView.state)
    return true
  }

  const onRedo = () => {
    if (!store.editor?.editorView) return
    redo(store.editor.editorView.state)
    return true
  }

  const onPrint = () => {
    if (!isTauri) return
    window.print()
    return true
  }

  const keymap = {
    [`${mod}-r`]: onReload,
    [`${mod}-q`]: onQuit,
    [`${mod}-n`]: onNew,
    [`${mod}-w`]: onDiscard,
    [`${mod}-s`]: onSave,
    'Cmd-Enter': onFullscreen,
    'Alt-Enter': onFullscreen,
    [`${mod}-z`]: onUndo,
    [`Shift-${mod}-z`]: onRedo,
    [`${mod}-y`]: onRedo,
    [`${mod}-p`]: onPrint,
  }

  const createYdoc = (bytes?: Uint8Array): Y.Doc => {
    const ydoc = new Y.Doc({gc: false})
    if (bytes) Y.applyUpdate(ydoc, bytes)
    return ydoc
  }

  const createFile = (params: Partial<File> = {}): File => {
    const ydoc = params.ydoc ?? Y.encodeStateAsUpdate(createYdoc())
    return {
      markdown: false,
      ...params,
      id: params.id ?? uuidv4(),
      ydoc,
    }
  }

  const updateCurrentFile = () => {
    const state = unwrap(store)
    if (!state.editor || !state.collab?.ydoc) return
    const index = store.files.findIndex((f) => f.id === state.editor?.id)
    if (index === -1) return
    setState('files', index, {
      lastModified: state.editor.lastModified,
      markdown: state.editor.markdown,
      path: state.editor.path,
      ydoc: Y.encodeStateAsUpdate(state.collab.ydoc),
    })
  }

  const discardText = async () => {
    const state: State = unwrap(store)
    const files = state.files.filter((f) => f.id !== state.editor?.id)
    const index = files.length - 1
    let file: File | undefined

    if (index !== -1) {
      file = await getFile(state, {id: files[index].id})
    }

    if (!file) {
      file = createFile()
    }

    const newState = await withFile(state, file)
    setState({
      args: {cwd: state.args?.cwd},
      ...newState,
      files,
    })

    updateEditorState(newState)
    if (file?.text) updateText(file.text)
  }

  const getTheme = (state: State, force = false) => {
    const matchDark = window.matchMedia('(prefers-color-scheme: dark)')
    const isDark = matchDark.matches
    const update = force || !state.config.theme
    if (update && isDark && !isDarkTheme(state.config)) {
      return {theme: 'dark', codeTheme: 'material-dark'}
    } else if (update && !isDark && isDarkTheme(state.config)) {
      return {theme: 'light', codeTheme: 'material-light'}
    }

    return {}
  }

  const getFile = async (state: State, req: OpenFile): Promise<File | undefined> => {
    const index = state.files.findIndex((file) => {
      return file.id === req.id || (file.path && file.path === req.path)
    })

    if (index === -1) return

    const file = state.files[index]
    if (file?.path) {
      const loadedFile = await loadFile(state.config, file.path)
      file.text = loadedFile.text
      file.lastModified = loadedFile.lastModified
      file.path = loadedFile.path
    }

    return file
  }

  const withFile = async (state: State, file: File): Promise<State> => {
    disconnectCollab(state)
    return withYjs({
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
        ydoc: createYdoc(file.ydoc),
      },
    })
  }

  const setError = (error: Error) => {
    console.error(error)
    if (error instanceof ServiceError) {
      setState({error: error.errorObject, loading: 'initialized'})
    } else {
      setState({error: {id: 'exception', props: {error}}, loading: 'initialized'})
    }
  }

  const disconnectCollab = (state: State) => {
    state.collab?.ydoc?.getMap('config').unobserve(onCollabConfigUpdate)
    state.collab?.provider?.disconnect()
    window.history.replaceState(null, '', '/')
    setState('collab', {started: false})
  }

  const onCollabConfigUpdate = (event: Y.YMapEvent<unknown>) => {
    const font = event.target.get('font') as string
    const fontSize = event.target.get('fontSize') as number
    const contentWidth = event.target.get('contentWidth') as number
    setState('config', {font, fontSize, contentWidth})
  }

  const withYjs = (state: State): State => {
    let join = false
    let started = false
    let room = state.editor!.id

    if (state.args?.room) {
      started = true
      join = room !== state.args.room
      room = state.args.room
      window.history.replaceState(null, '', `/${room}`)
    }

    const ydoc = join ? createYdoc() : (state.collab?.ydoc ?? createYdoc())
    const permanentUserData = new Y.PermanentUserData(ydoc)

    const provider = new WebsocketProvider(COLLAB_URL, room, ydoc, {connect: started})
    const configType = ydoc.getMap('config')
    configType.set('font', state.config.font)
    configType.set('fontSize', state.config.fontSize)
    configType.set('contentWidth', state.config.contentWidth)
    configType.observe(onCollabConfigUpdate)

    provider.on('connection-error', () => {
      remote.log('ERROR', '🌐 Connection error')
      disconnectCollab(store)
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

  const updateText = (text?: {[key: string]: any}) => {
    if (!text) return
    const schema = store.editor?.editorView?.state?.schema
    if (!schema || !store.collab?.ydoc) return
    let ynode: Node
    try {
      ynode = yDocToProsemirror(schema, store.collab.ydoc)
    } catch(e) {
      ynode = new Node()
    }

    const node = Node.fromJSON(schema, text.doc)
    if (!node.eq(ynode)) {
      const ydoc = prosemirrorJSONToYDoc(schema, text.doc)
      const update = Y.encodeStateAsUpdate(ydoc)
      const type = store.collab.ydoc.getXmlFragment('prosemirror')
      type.delete(0, type.length)
      Y.applyUpdate(store.collab.ydoc, update)
    }
  }

  const updateEditorState = (state: State, node?: Element) => {
    const extensions = createExtensions({
      config: state.config,
      markdown: state.editor?.markdown,
      fullscreen: state.fullscreen,
      path: state.editor?.path,
      keymap,
      y: state.collab?.ydoc ? {
        type: state.collab.ydoc.getXmlFragment('prosemirror'),
        provider: state.collab.provider!,
        permanentUserData: state.collab.permanentUserData!,
        onFirstRender: () => {
          setState('collab', 'ready', true)
        }
      } : undefined
    })

    let editorView = state.editor?.editorView

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

        if ((maybeSkip && !isUndo) || snapshotView()) return

        setState('editor', 'lastModified', new Date())
        updateCurrentFile()
        saveEditor(store)
        remote.log('info', '💾 Saved updated text')
      }

      editorView = new EditorView(node!, {
        state: editorState,
        nodeViews,
        dispatchTransaction,
      })

      setState('editor', (prev) => ({...prev, editorView}))
    }

    editorView.setProps({state: editorState, nodeViews})
    editorView.focus()
  }

  const init = async (node: Element) => {
    const state = unwrap(store)

    try {
      let data = await fetchData(state)
      let text: FileText | undefined

      if (isTauri && data.window) {
        await remote.updateWindow(data.window)
      }

      if (data.args?.dir) { // If app was started with a directory as argument
      } else if (data.args?.file) { // If app was started with a file as argument
        const path = data.args.file
        let file = await getFile(data, {path})
        if (!file) {
          const loadedFile = await loadFile(data.config, path)
          file = createFile(loadedFile)
          data.files.push(file as File)
        }
        data = await withFile(data, file)
        text = file.text
      } else if (data.args?.room) { // Join collab
        let file = await getFile(data, {id: data.args.room})
        if (!file) {
          file = createFile({id: data.args.room})
          data.files.push(file as File)
        }
        data = await withFile(data, file)
      } else if (data.editor?.id) { // Restore last saved file
        const file = await getFile(data, {id: data.editor.id})
        if (file) {
          data = await withFile(data, file)
          text = file.text
        } else {
          data.editor = undefined
        }
      }

      // Init from empty state or file not found
      if (!data.args?.dir && !data.editor?.id) {
        const file = createFile({id: data.args?.room})
        data.files.push(file)
        data = await withFile(data, file)
      }

      const newState: State = {
        ...state,
        ...data,
        config: {...data.config, ...getTheme(data)},
        loading: 'initialized'
      }

      if (isTauri && newState.config?.alwaysOnTop) {
        await remote.setAlwaysOnTop(true)
      }

      setState(newState)
      updateEditorState(newState, node)
      updateText(text)
    } catch (error: any) {
      remote.log('error', `Error during init: ${error.message}`)
      setError(error)
    }

    if (isTauri) {
      await remote.show()
    }
  }

  const clean = async () => {
    disconnectCollab(store)
    const file = createFile()
    const state: State = await withFile({
      ...createState(),
      args: {cwd: store.args?.cwd},
      loading: 'initialized',
      files: [file],
      fullscreen: store.fullscreen,
      editor: {editorView: store.editor?.editorView, id: file.id},
    }, file)

    setState(state)
    updateEditorState(state)
    updateText(createEmptyText())
  }

  const discard = async () => {
    const editorView = store.editor?.editorView
    if (!editorView) return

    if (store.editor?.path) {
      await discardText()
      editorView?.focus()
      return true
    } else if (store.files.length > 1 && isEmpty(editorView?.state)) {
      await discardText()
      editorView?.focus()
      return true
    } else if (store.collab?.started) {
      await discardText()
      editorView?.focus()
      return true
    } else if (isEmpty(editorView?.state)) {
      newFile()
      editorView?.focus()
      return true
    }

    selectAll(editorView?.state, editorView?.dispatch)
    deleteSelection(editorView?.state, editorView?.dispatch)
    editorView?.focus()
  }

  const newFile = async () => {
    if (isEmpty(store.editor?.editorView?.state)) {
      setState('args', 'dir', undefined)
      return
    }

    const state: State = unwrap(store)
    const file = createFile()

    disconnectCollab(state)
    const update = await withFile({
      ...state,
      args: {cwd: state.args?.cwd},
      files: [...state.files, file],
    }, file)

    setState(update)
    updateEditorState(update)
  }

  const openFile = async (req: OpenFile) => {
    const state: State = unwrap(store)
    let file = await getFile(state, req)
    if (!file && req.path) {
      const loadedFile = await loadFile(state.config, req.path)
      file = createFile(loadedFile)
      state.files.push(file as File)
    }

    if (!file) return

    if (isEmpty(state.editor?.editorView?.state)) {
      const index = state.files.findIndex((x) => x.id === state.editor?.id)
      state.files.splice(index, 1)
    }

    if (state.args?.room) state.args.room = undefined
    const update = await withFile(state, file)
    setState(update)
    updateEditorState(update)
    if (file.text) updateText(file.text)
  }

  const deleteFile = async (file: File) => {
    const state: State = unwrap(store)
    const files = state.files.filter((f: File) => f.id !== file.id)
    const newState = {...state, files}
    setState(newState)
    db.deleteFile(file.id)
    remote.log('info', '💾 Deleted file')
  }

  const setFullscreen = (fullscreen: boolean) => {
    remote.setFullscreen(fullscreen)
    setState('fullscreen', fullscreen)
    updateEditorState(store)
  }

  const setAlwaysOnTop = (alwaysOnTop: boolean) => {
    remote.setAlwaysOnTop(alwaysOnTop)
    setState('config', {alwaysOnTop})
  }

  const startCollab = () => {
    window.history.replaceState(null, '', `/${store.editor?.id}`)
    store.collab?.provider?.connect()
    setState('collab', {started: true})
  }

  const stopCollab = () => {
    disconnectCollab(unwrap(store))
  }

  const addVersion = () => {
    const state = unwrap(store)
    const ydoc = state.collab?.ydoc
    if (!ydoc) return

    const versions = ydoc.getArray<Version>('versions')
    const prevVersion = versions.get(versions.length - 1)
    const prevSnapshot = prevVersion ? Y.decodeSnapshot(prevVersion.snapshot) : Y.emptySnapshot
    const snapshot = Y.snapshot(ydoc)

    if (prevVersion) {
      prevSnapshot.sv.set(prevVersion.clientID, (prevSnapshot.sv.get(prevVersion.clientID))! + 1)
    }

    if (!Y.equalSnapshots(prevSnapshot, snapshot)) {
      versions.push([{
        date: state.editor?.lastModified?.getTime() ?? 0,
        snapshot: Y.encodeSnapshot(snapshot),
        clientID: ydoc.clientID,
      }])
    }

    saveEditor(state)
    remote.log('info', '💾 Saved new snapshot version')
  }

  const renderVersion = (version: Version) => {
    setSnapshotView(true)
    const snapshot = Y.decodeSnapshot(version.snapshot)
    const prevSnapshot = Y.emptySnapshot
    const tr = store.editor?.editorView?.state.tr
    tr?.setMeta(ySyncPluginKey, {snapshot, prevSnapshot})
    store.editor?.editorView?.dispatch(tr!)
  }

  const unrenderVersion = () => {
    const state = unwrap(store)
    const editorState = state.editor?.editorView?.state
    if (!editorState) return
    const binding = ySyncPluginKey.getState(editorState).binding
    if (binding) binding.unrenderSnapshot()
    setSnapshotView(false)
  }

  const applyVersion = (version: Version) => {
    const state = unwrap(store)
    const ydoc = state.collab?.ydoc
    const editorView = state.editor?.editorView
    if (!ydoc || !editorView?.state) return

    const snapshot = Y.decodeSnapshot(version.snapshot)
    const newDoc = Y.createDocFromSnapshot(ydoc, snapshot)
    const node = yDocToProsemirror(editorView.state.schema, newDoc)
    unrenderVersion()

    const tr = editorView?.state.tr
    const slice = new Slice(node.content, 0, 0)
    tr!.replace(0, editorView.state.doc.content.size, slice)
    editorView?.dispatch(tr!)
  }

  const toggleMarkdown = () => {
    const state: State = unwrap(store)
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
        keymap,
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
    setState('editor', (prev) => ({...prev, markdown, lastModified}))
    updateEditorState(store)
    updateText({...createEmptyText(), doc})
    updateCurrentFile()
    saveEditor(store)
    remote.log('info', '💾 Toggle markdown')
  }

  const updateConfig = (conf: Partial<Config>) => {
    const state: State = unwrap(store)
    if (conf.font) state.collab?.ydoc?.getMap('config').set('font', conf.font)
    if (conf.fontSize) state.collab?.ydoc?.getMap('config').set('fontSize', conf.fontSize)
    if (conf.contentWidth) state.collab?.ydoc?.getMap('config').set('contentWidth', conf.contentWidth)
    const config = {...state.config, ...conf}
    setState('config', config)
    updateEditorState({...state, config})
    saveConfig(unwrap(store))
  }

  const updateContentWidth = (contentWidth: number) => {
    store.collab?.ydoc?.getMap('config').set('contentWidth', contentWidth)
    setState('config', 'contentWidth', contentWidth)
    saveConfig(unwrap(store))
  }

  const updatePath = (path: string) => {
    setState('editor', 'path', path)
    updateCurrentFile()
  }

  const updateTheme = () => {
    setState('config', getTheme(unwrap(store), true))
    saveConfig(unwrap(store))
  }

  const updateWindow = (win: Partial<Window>) => {
    if (store.fullscreen) return
    setState('window', {...store.window, ...win})
    saveWindow(unwrap(store))
  }

  const ctrl = {
    init,
    clean,
    discard,
    newFile,
    openFile,
    deleteFile,
    setFullscreen,
    setAlwaysOnTop,
    startCollab,
    stopCollab,
    addVersion,
    renderVersion,
    unrenderVersion,
    applyVersion,
    toggleMarkdown,
    updateConfig,
    updateContentWidth,
    updatePath,
    updateTheme,
    updateWindow,
    setState,
  }

  return {store, ctrl}
}
