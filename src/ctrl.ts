import {createSignal} from 'solid-js'
import {Store, createStore, unwrap} from 'solid-js/store'
import {v4 as uuidv4} from 'uuid'
import * as db from 'idb-keyval'
import {fromUint8Array, toUint8Array} from 'js-base64'
import {EditorView} from 'prosemirror-view'
import {EditorState, Transaction} from 'prosemirror-state'
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
import {debounce} from 'ts-debounce'
import * as remote from '@/remote'
import {createExtensions, createEmptyText, createSchema, createNodeViews} from '@/prosemirror-setup'
import {State, File, Config, Version, ServiceError, createState, Window, FileText} from '@/state'
import {COLLAB_URL, isTauri, mod} from '@/env'
import {serialize, createMarkdownParser} from '@/markdown'
import {isDarkTheme, themes} from '@/config'
import {isEmpty} from '@/prosemirror'

export const createCtrl = (initial: State): [Store<State>, any] => {
  const [store, setState] = createStore(initial)
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
    if (!isTauri || store.editor?.path) return false
    const path = await remote.save(store.editor?.editorView.state)
    if (path) ctrl.updatePath(path)
  }

  const onFullscreen = () => {
    if (!isTauri) return
    ctrl.setFullscreen(!store.fullscreen)
    return true
  }

  const onUndo = () => {
    if (!store.editor?.editorView) return
    undo(store.editor?.editorView.state)
    return true
  }

  const onRedo = () => {
    if (!store.editor?.editorView) return
    redo(store.editor?.editorView.state)
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

  const fetchData = async (): Promise<State> => {
    let args = await remote.getArgs().catch(() => undefined)
    const state: State = unwrap(store)

    if (!isTauri) {
      const room = window.location.pathname?.slice(1).trim()
      if (room) args = {room}
    }
    const data = await db.get('state')
    let parsed: any
    if (data !== undefined) {
      try {
        parsed = JSON.parse(data)
      } catch (err) {
        // ignore
      }
    }

    if (!parsed) {
      return {args, ...state}
    }

    const id = parsed.editor?.id
    const config = {...state.config, ...parsed.config}
    const files = []

    for (const file of parsed.files) {
      try {
        if (!file.id) file.id = uuidv4()
        if (file.ydoc) file.ydoc = toUint8Array(file.ydoc)
        if (file.lastModified) file.lastModified = new Date(file.lastModified)
        files.push(file)
      } catch (err) {
        remote.log('ERROR', 'Ignore file due to invalid ydoc.')
      }
    }

    return {
      ...parsed,
      args,
      ...state,
      editor: {id},
      files,
      config,
      storageSize: data.length,
      collab: undefined,
    }
  }

  const createYdoc = (bytes?: Uint8Array): Y.Doc => {
    const ydoc = new Y.Doc({gc: false})
    if (bytes) Y.applyUpdate(ydoc, bytes)
    return ydoc
  }

  const discardText = async () => {
    const state: State = unwrap(store)
    const files = state.files.filter((f) => f.id !== state.editor.id)
    const index = files.length - 1
    let file = index !== -1 ? files[index] : {id: uuidv4(), text: createEmptyText()}

    if (file?.path) {
      file = await loadFile(state.config, file)
    }

    const next: Partial<State> = {
      editor: {
        id: file.id,
        editorView: state.editor?.editorView,
        path: file.path,
        lastModified: file.lastModified,
        markdown: file.markdown,
      },
      collab: {ydoc: createYdoc(file.ydoc)},
      args: {cwd: state.args?.cwd},
    }

    disconnectCollab(state)
    const newState = withYjs({...state, ...next})
    setState({
      args: {cwd: state.args?.cwd},
      collab: undefined,
      error: undefined,
      ...newState,
      files,
    })

    updateEditorState(newState)
    if (!file.ydoc && file.text) updateText(file.text)
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

  const loadFile = async (config: Config, file: Partial<File>): Promise<File> => {
    try {
      const resolvedPath = await remote.resolvePath([file.path])
      const fileContent = await remote.readFile(resolvedPath)
      const lastModified = await remote.getFileLastModified(resolvedPath)
      const extensions = createExtensions({
        config,
        markdown: false,
        path: resolvedPath,
        keymap,
      })
      const schema = createSchema(extensions)
      const parser = createMarkdownParser(schema)
      const doc = parser.parse(fileContent).toJSON()
      const text = {
        doc,
        selection: {
          type: 'text',
          anchor: 1,
          head: 1
        }
      }

      return {
        id: file.id ?? uuidv4(),
        text,
        lastModified,
        path: resolvedPath,
      }
    } catch (e) {
      throw new ServiceError('file_permission_denied', {error: e})
    }
  }

  const getFile = async (state: State, f: Partial<File>): Promise<Partial<File>> => {
    const index = state.files.findIndex((file) => {
      return file.id === f.id || (file.path && file.path === f.path)
    })

    if (index === -1) return
    let file = state.files[index]
    if (file?.path) {
      file = await loadFile(state.config, file)
    }

    return file
  }

  const withFile = async (state: State, file: Partial<File>): Promise<State> => {
    disconnectCollab(state)
    return withYjs({
      ...state,
      error: undefined,
      editor: {
        id: file.id,
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

  const saveState = async (state: State) => {
    if (!state.editor?.editorView || snapshotView()) {
      return
    }

    const files = []
    for (let i = 0; i < state.files.length; i++) {
      const file = state.files[i]
      let documentState = file.ydoc
      let lastModified = file.lastModified
      let markdown = file.markdown
      if (file.id === state.editor.id) {
        documentState = Y.encodeStateAsUpdate(state.collab.ydoc)
        lastModified = state.editor.lastModified
        markdown = state.editor.markdown
      }

      if (!lastModified) {
        continue
      }

      const json = {
        ...file,
        lastModified,
        markdown,
        ydoc: fromUint8Array(documentState),
      }

      files.push({...json, storageSize: JSON.stringify(json).length})

      if (file.id === state.editor.id) {
        setState('files', i, {ydoc: documentState, lastModified})
      }
    }

    const data = {
      files,
      config: state.config,
      editor: {
        id: state.editor?.id,
      },
      window: state.window,
    }

    if (state.editor?.path) {
      const text = serialize(store.editor?.editorView.state)
      await remote.writeFile(state.editor.path, text)
    }

    const json = JSON.stringify(data)
    setState('storageSize', json.length)
    db.set('state', json)
  }

  const saveStateDebounced = debounce((newState: State, log?: string) => {
    saveState(newState)
    if (log) remote.log('info', log)
  }, 200)

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
    let room = state.editor.id

    if (state.args?.room) {
      started = true
      join = room !== state.args.room
      room = state.args.room
      window.history.replaceState(null, '', `/${room}`)
    }

    const ydoc = join ? createYdoc() : state.collab.ydoc
    const permanentUserData = new Y.PermanentUserData(ydoc)

    const provider = new WebsocketProvider(COLLAB_URL, room, ydoc, {connect: started})
    const configType = ydoc.getMap('config')
    configType.set('font', state.config.font)
    configType.set('fontSize', state.config.fontSize)
    configType.set('contentWidth', state.config.contentWidth)
    configType.observe(onCollabConfigUpdate)

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

    if (room !== state.args?.room) {
      // let files = newState.files
      // if (!newState.error) {
      //   files = addToFiles(files, state)
      // }

      // newState = {
      //   ...newState,
      //   files,
      //   editor: {
      //     ...state.editor,
      //     id: room,
      //     lastModified: undefined,
      //     path: undefined,
      //   },
      //   error: undefined,
      // }
    }

    return newState
  }

  const updateText = (text?: {[key: string]: any}) => {
    if (!text) return
    const schema = store.editor?.editorView?.state?.schema
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
      config: state.config ?? store.config,
      markdown: state.editor?.markdown ?? store.editor?.markdown,
      path: state.editor?.path ?? store.editor?.path,
      keymap,
      y: {
        type: state.collab.ydoc.getXmlFragment('prosemirror'),
        provider: state.collab.provider,
        permanentUserData: state.collab.permanentUserData,
        onFirstRender: () => {
          setState('collab', 'ready', true)
        }
      }
    })

    let editorView = store.editor?.editorView

    const nodeViews = createNodeViews(extensions)
    const schema = createSchema(extensions)
    const plugins = extensions.reduce((acc, e) => e.plugins ? e.plugins(acc, schema) : acc, [])
    const editorState = EditorState.fromJSON({schema, plugins}, createEmptyText())

    if (!editorView) {
      const dispatchTransaction = (tr: Transaction) => {
        const newState = editorView.state.apply(tr)
        editorView.updateState(newState)
        if (!tr.docChanged) return
        if (tr.getMeta('addToHistory') === false) return

        setState((prev) => {
          const newState = {
            ...prev,
            editor: {
              ...prev.editor,
              lastModified: new Date(),
            }
          }

          saveStateDebounced(newState, '💾 Saved updated text')
          return newState
        })
      }

      editorView = new EditorView(node, {
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
    try {
      let data = await fetchData()
      let text: FileText

      if (isTauri && data.window) {
        await remote.updateWindow(data.window)
      }

      if (data.args?.dir) { // If app was started with a directory as argument
        data = withYjs(data)
      } else if (data.args?.text) { // Currenly dead code, pass text as deeplink
        const file = await getFile(data, {text: JSON.parse(data.args.text)})
        data = await withFile(data, file)
      } else if (data.args?.file) { // If app was started with a file as argument
        const path = data.args.file
        let file = await getFile(data, {path})
        if (!file) {
          file = await loadFile(data.config, {path})
          file.ydoc = Y.encodeStateAsUpdate(createYdoc())
          data.files.push(file as File)
        }
        data = await withFile(data, file)
        text = file.text
      } else if (data.args?.room) { // Join collab
        data.editor = {id: data.args.room}
      }

      if (data.editor?.id) { // Restore last saved file
        const file = await getFile(data, {id: data.editor.id})
        if (file) {
          data = await withFile(data, file)
          text = file.text
        } else {
          data.editor.id = undefined
        }
      }

      // Init from empty state or file not found
      if (!data.editor?.id) {
        const ydoc = createYdoc()
        const id = data.args?.room ?? uuidv4()
        const file = {id, ydoc: Y.encodeStateAsUpdate(ydoc)}
        data.editor = {id}
        data.collab = {ydoc}
        data.files.push(file)
        data = withYjs(data)
      }

      const newState: State = {
        ...unwrap(store),
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
    } catch (error) {
      remote.log('error', `Error during init: ${error.message}`)
      setError(error)
    }

    if (isTauri) {
      await remote.show()
    }
  }

  const clean = () => {
    disconnectCollab(store)
    const id = uuidv4()
    const ydoc = createYdoc()
    const file = {id, ydoc: Y.encodeStateAsUpdate(ydoc)}

    const state: State = withYjs({
      ...createState(),
      collab: {ydoc},
      args: {cwd: store.args?.cwd},
      loading: 'initialized',
      files: [file],
      fullscreen: store.fullscreen,
      editor: {editorView: store.editor.editorView, id},
      error: undefined,
    })

    setState(state)
    updateEditorState(state)
    updateText(createEmptyText())
  }

  const discard = async () => {
    const editorView = store.editor?.editorView
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

  const newFile = () => {
    if (isEmpty(store.editor?.editorView?.state)) {
      return
    }

    const state: State = unwrap(store)
    const ydoc = createYdoc()
    const file = {
      id: uuidv4(),
      markdown: false,
      ydoc: Y.encodeStateAsUpdate(ydoc),
      lastModified: new Date(),
    }

    disconnectCollab(state)
    const update = withYjs({
      ...state,
      args: {cwd: state.args?.cwd},
      files: [...state.files, file],
      error: undefined,
      editor: {
        ...state.editor,
        id: file.id,
        markdown: file.markdown,
        lastModified: file.lastModified,
      },
      collab: {ydoc},
    })

    setState(update)
    updateEditorState(update)
  }

  const openFile = async (f: Partial<File>) => {
    const state: State = unwrap(store)
    let file = await getFile(state, f)
    if (!file && f.path) {
      file = await loadFile(state.config, f)
      state.files.push(file as File)
    }

    if (!file) return

    if (isEmpty(state.editor?.editorView?.state)) {
      const index = state.files.findIndex((x) => x.id === state.editor.id)
      state.files.splice(index, 1)
    }

    if (state.args?.room) state.args.room = undefined
    const update = await withFile(state, file)
    setState(update)
    updateEditorState(update)
    if (!file.ydoc && file.text) updateText(file.text)
  }

  const deleteFile = async (file: File) => {
    const state: State = unwrap(store)
    const files = state.files.filter((f: File) => f.id !== file.id)
    const newState = {...state, files}
    setState(newState)
    saveState(newState)
    remote.log('info', '💾 Deleted file')
  }

  const setFullscreen = (fullscreen: boolean) => {
    remote.setFullscreen(fullscreen)
    setState('fullscreen', fullscreen)
  }

  const setAlwaysOnTop = (alwaysOnTop: boolean) => {
    remote.setAlwaysOnTop(alwaysOnTop)
    setState('config', {alwaysOnTop})
  }

  const startCollab = () => {
    window.history.replaceState(null, '', `/${store.editor.id}`)
    store.collab.provider.connect()
    setState('collab', {started: true})
  }

  const stopCollab = () => {
    disconnectCollab(unwrap(store))
  }

  const addVersion = () => {
    const state = unwrap(store)
    const ydoc = state.collab.ydoc
    const versions = ydoc.getArray<Version>('versions')
    const prevVersion = versions.get(versions.length - 1)
    const prevSnapshot = prevVersion ? Y.decodeSnapshot(prevVersion.snapshot) : Y.emptySnapshot
    const snapshot = Y.snapshot(ydoc)

    if (prevVersion) {
      prevSnapshot.sv.set(prevVersion.clientID, (prevSnapshot.sv.get(prevVersion.clientID)) + 1)
    }

    if (!Y.equalSnapshots(prevSnapshot, snapshot)) {
      versions.push([{
        date: state.editor?.lastModified?.getTime(),
        snapshot: Y.encodeSnapshot(snapshot),
        clientID: ydoc.clientID,
      }])
    }

    saveState(state)
    remote.log('info', '💾 Saved new snapshot version')
  }

  const renderVersion = (version: Version) => {
    setSnapshotView(true)
    const snapshot = Y.decodeSnapshot(version.snapshot)
    const prevSnapshot = Y.emptySnapshot
    const tr = store.editor?.editorView.state.tr
    tr.setMeta(ySyncPluginKey, {snapshot, prevSnapshot})
    store.editor?.editorView.dispatch(tr)
  }

  const unrenderVersion = () => {
    const state = unwrap(store)
    const binding = ySyncPluginKey.getState(state.editor?.editorView.state).binding
    if (binding) binding.unrenderSnapshot()
    setSnapshotView(false)
  }

  const applyVersion = (version: Version) => {
    const state = unwrap(store)
    const ydoc = state.collab.ydoc

    const snapshot = Y.decodeSnapshot(version.snapshot)
    const newDoc = Y.createDocFromSnapshot(ydoc, snapshot)
    const node = yDocToProsemirror(state.editor?.editorView.state.schema, newDoc)
    unrenderVersion()

    const tr = state.editor?.editorView.state.tr
    const slice = new Slice(node.content, 0, 0)
    tr.replace(0, state.editor?.editorView.state.doc.content.size, slice)
    state.editor?.editorView.dispatch(tr)
  }

  const toggleMarkdown = () => {
    const state: State = unwrap(store)
    const editorState = store.editor?.editorView.state
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
      doc = text.toJSON()
    }

    const lastModified = new Date()
    setState('editor', (prev) => ({...prev, markdown, lastModified}))
    updateEditorState(store)
    updateText({...createEmptyText(), doc})
    saveState(store)
    remote.log('info', '💾 Toggle markdown')
  }

  const updateConfig = (conf: Partial<Config>) => {
    const state: State = unwrap(store)
    if (conf.font) state.collab?.ydoc.getMap('config').set('font', conf.font)
    if (conf.fontSize) state.collab?.ydoc.getMap('config').set('fontSize', conf.fontSize)
    if (conf.contentWidth) state.collab?.ydoc.getMap('config').set('contentWidth', conf.contentWidth)
    const config = {...state.config, ...conf}
    setState('config', config)
    updateEditorState({...state, config})
    saveStateDebounced(store, '💾 Saved new config')
  }

  const updateContentWidth = (contentWidth: number) => {
    store.collab?.ydoc.getMap('config').set('contentWidth', contentWidth)
    setState('config', 'contentWidth', contentWidth)
    saveStateDebounced(store, '💾 Saved new content width')
  }

  const updatePath = (path: string) => {
    setState('editor', 'path', path)
  }

  const updateTheme = () => {
    setState('config', getTheme(unwrap(store), true))
    saveStateDebounced(store, '💾 Saved new theme')
  }

  const updateWindow = (win: Window) => {
    setState('window', {...store.window, ...win})
    saveStateDebounced(store)
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

  return [store, ctrl]
}
