import {createSignal} from 'solid-js'
import {Store, createStore, unwrap} from 'solid-js/store'
import {v4 as uuidv4} from 'uuid'
import * as db from 'idb-keyval'
import {fromUint8Array, toUint8Array} from 'js-base64'
import {EditorView} from 'prosemirror-view'
import {EditorState, Transaction} from 'prosemirror-state'
import {Node, Schema, Slice} from 'prosemirror-model'
import {selectAll, deleteSelection} from 'prosemirror-commands'
import * as Y from 'yjs'
import {undo, redo, ySyncPluginKey, yDocToProsemirror, prosemirrorJSONToYDoc} from 'y-prosemirror'
import {WebsocketProvider} from 'y-websocket'
import {uniqueNamesGenerator, adjectives, animals} from 'unique-names-generator'
import {debounce} from 'ts-debounce'
import * as remote from './remote'
import {createExtensions, createEmptyText} from './prosemirror'
import {State, File, Config, Version, ServiceError, createState} from './state'
import {COLLAB_URL, isTauri, mod} from './env'
import {serialize, createMarkdownParser} from './markdown'
import {isDarkTheme, themes} from './config'
import {isEmpty} from './prosemirror/state'

const isState = (x: any) =>
  (typeof x.lastModified !== 'string') &&
  Array.isArray(x.files)

const isFile = (x: any): boolean => x && (x.text || x.path || x.ydoc)

const isConfig = (x: any): boolean =>
  (typeof x.theme === 'string' || x.theme === undefined) &&
  (typeof x.codeTheme === 'string' || x.codeTheme === undefined) &&
  (typeof x.font === 'string' || x.font === undefined)

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

  const onFullscreen = () => {
    if (!isTauri) return
    ctrl.setFullscreen(!store.fullscreen)
    return true
  }

  const onUndo = () => {
    if (!store.editorView) return
    undo(store.editorView.state)
    return true
  }

  const onRedo = () => {
    if (!store.editorView) return
    redo(store.editorView.state)
    return true
  }

  const keymap = {
    [`${mod}-r`]: onReload,
    [`${mod}-q`]: onQuit,
    [`${mod}-n`]: onNew,
    [`${mod}-w`]: onDiscard,
    'Cmd-Enter': onFullscreen,
    'Alt-Enter': onFullscreen,
    [`${mod}-z`]: onUndo,
    [`Shift-${mod}-z`]: onRedo,
    [`${mod}-y`]: onRedo,
  }

  const fetchData = async (): Promise<State> => {
    let args = await remote.getArgs().catch(() => undefined)
    const state: State = unwrap(store)

    if (!isTauri) {
      const room = window.location.pathname?.slice(1).trim()
      args = {room: room || undefined}
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
      return {...state, args, collab: {ydoc: createYdoc()}}
    }

    let config = {...state.config, ...parsed.config}
    if (!isConfig(config)) {
      config = createState().config
    }

    let newState = {
      ...parsed,
      config,
      args,
      storageSize: data.length,
      collab: {
        ...parsed.collab,
        ydoc: parsed.collab.ydoc ? createYdoc(toUint8Array(parsed.collab.ydoc)) : createYdoc(),
      }
    }

    if (newState.lastModified) {
      newState.lastModified = new Date(newState.lastModified)
    }

    const files = []
    for (const file of parsed.files) {
      if (!isFile(file)) continue
      if (file.ydoc) file.ydoc = toUint8Array(file.ydoc)
      files.push(file)
    }

    newState.files = files

    if (!isState(newState)) {
      newState = createState()
    }

    return newState
  }

  const addToFiles = (files: File[], prev: State) => [...files, {
    ydoc: Y.encodeStateAsUpdate(prev.collab.ydoc),
    excerpt: prev.excerpt,
    lastModified: prev.lastModified?.toISOString(),
    path: prev.path,
    markdown: prev.markdown,
    room: prev.collab.room,
  }]

  const createYdoc = (bytes?: Uint8Array): Y.Doc => {
    const ydoc = new Y.Doc({gc: false})
    if (bytes) Y.applyUpdate(ydoc, bytes)
    return ydoc
  }

  const discardText = async () => {
    const state: State = unwrap(store)
    const index = state.files.length - 1
    let file = index !== -1 ? state.files[index] : {text: createEmptyText()}
    const files = state.files.filter((f: File) => f !== file)

    if (file?.path) {
      file = await loadFile(state.config, file.path)
    }

    const next: Partial<State> = {
      lastModified: file.lastModified ? new Date(file.lastModified) : undefined,
      path: file.path,
      markdown: file.markdown,
      collab: {room: file.room, ydoc: createYdoc(file.ydoc)},
      args: {cwd: state.args?.cwd},
    }

    disconnectCollab(state)
    const newState = withYjs({...state, ...next})
    updateEditorState(newState, false)
    setState({
      args: {cwd: state.args?.cwd},
      collab: undefined,
      error: undefined,
      ...newState,
      files,
    })

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

  const loadFile = async (config: Config, path: string): Promise<File> => {
    try {
      const fileContent = await remote.readFile(path)
      const lastModified = await remote.getFileLastModified(path)
      const extensions = createExtensions({
        config,
        markdown: false,
        path,
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
        text,
        lastModified: lastModified.toISOString(),
        path: path
      }
    } catch (e) {
      throw new ServiceError('file_permission_denied', {error: e})
    }
  }

  const eqFile = (a: File, b: File) =>
    (a.text !== undefined && a.text === b.text) ||
    (a.ydoc !== undefined && a.ydoc === b.ydoc) ||
    (a.path !== undefined && a.path === b.path)

  const getFile = async (state, f: File): Promise<File> => {
    let index = -1
    for (let i = 0; i < state.files.length; i++) {
      if (eqFile(state.files[i], f)) {
        index = i
        break
      }
    }

    let file = index === -1 ? f : state.files[index]

    if (file?.path) {
      file = await loadFile(state.config, file.path)
    }

    return file
  }

  const withFile = async (state: State, file: File): Promise<State> => {
    let files = state.files.filter((f) => !eqFile(f, file))

    if (!isEmpty(state.editorView?.state) && state.lastModified) {
      files = addToFiles(files, state)
    }

    const next: Partial<State> = {
      lastModified: file.lastModified ? new Date(file.lastModified) : undefined,
      path: file.path,
      markdown: file.markdown,
      collab: {room: file.room, ydoc: createYdoc(file.ydoc)},
      excerpt: file.excerpt,
    }

    disconnectCollab(state)
    return withYjs({
      ...state,
      args: {cwd: state.args?.cwd},
      files,
      error: undefined,
      ...next,
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

  const saveState = debounce(async (state: State) => {
    if (!state.editorView || snapshotView()) {
      return
    }

    const documentState = Y.encodeStateAsUpdate(state.collab.ydoc)
    const len = Math.min(150, store.editorView.state.doc.nodeSize - 2)
    const excerpt = store.editorView.state.doc.textBetween(0, len, ' ')
    const data: any = {
      excerpt,
      lastModified: state.lastModified,
      files: state.files.map((f) => {
        const json = {...f, ydoc: fromUint8Array(f.ydoc)}
        return {...json, storageSize: JSON.stringify(json).length}
      }),
      config: state.config,
      path: state.path,
      markdown: state.markdown,
      collab: {
        ydoc: fromUint8Array(documentState),
        room: state.collab?.room,
      }
    }

    if (state.path) {
      const text = serialize(store.editorView.state)
      await remote.writeFile(state.path, text)
    }

    const json = JSON.stringify(data)
    setState({storageSize: json.length, excerpt})
    db.set('state', json)
  }, 200)

  const disconnectCollab = (state: State) => {
    state.collab?.ydoc?.getMap('config').unobserve(onCollabConfigUpdate)
    state.collab?.provider?.disconnect()
    window.history.replaceState(null, '', '/')
    setState('collab', {started: false})
  }

  const onCollabConfigUpdate = (event: any) => {
    const font = event.target.get('font') as string
    const fontSize = event.target.get('fontSize') as number
    const contentWidth = event.target.get('contentWidth') as number
    setState('config', {font, fontSize, contentWidth})
  }

  const withYjs = (state: State): State => {
    let shouldBackup = false
    let started = false
    let room = state.collab?.room ?? uuidv4()
    if (state.args?.room) {
      started = true
      room = state.args.room
      shouldBackup = state.args.room !== state.collab.room
      window.history.replaceState(null, '', `/${room}`)
    }

    const ydoc = shouldBackup ? createYdoc() : state.collab.ydoc
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

    let newState = {
      ...state,
      collab: {
        started,
        room,
        ydoc,
        provider,
        permanentUserData,
      }
    }

    if (shouldBackup) {
      let files = newState.files
      if (!newState.error) {
        files = addToFiles(files, state)
      }

      newState = {
        ...newState,
        files,
        lastModified: undefined,
        path: undefined,
        error: undefined,
        excerpt: undefined,
      }
    }

    return newState
  }

  const updateText = (text?: {[key: string]: any}) => {
    if (!text) return
    const schema = store.editorView.state.schema
    let ynode
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

  const updateEditorState = (state: State, reconfigure = true, node?: Element) => {
    const extensions = createExtensions({
      config: state.config ?? store.config,
      markdown: state.markdown ?? store.markdown,
      path: state.path ?? store.path,
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

    let editorView = store.editorView
    let editorState: EditorState

    const nodeViews = createNodeViews(extensions)
    const schema = reconfigure ? editorView?.state.schema : createSchema(extensions)
    const plugins = extensions.reduce((acc, e) => e.plugins ? e.plugins(acc, schema) : acc, [])

    if (reconfigure) {
      editorState = editorView.state.reconfigure({plugins})
    } else {
      editorState = EditorState.fromJSON({schema, plugins}, createEmptyText())
    }

    if (!editorView) {
      const dispatchTransaction = (tr: Transaction) => {
        if (!store.editorView) return
        const newState = store.editorView.state.apply(tr)
        store.editorView.updateState(newState)
        if (!tr.docChanged) return
        if (tr.getMeta('addToHistory') === false) return

        setState((prev) => {
          const newState = {...prev, lastModified: new Date()}
          saveState(newState)
          return newState
        })
      }

      editorView = new EditorView(node, {
        state: editorState,
        nodeViews,
        dispatchTransaction,
      })

      setState({editorView})
    }

    editorView.setProps({state: editorState, nodeViews})
    editorView.focus()
  }

  const createNodeViews = (extensions) =>
    extensions.reduce((acc, e) => e.nodeViews ? ({...acc, ...e.nodeViews}) : acc, {})

  const createSchema = (extensions) =>
    new Schema(extensions.reduce(
      (acc, e) => e.schema ? e.schema(acc) : acc,
      {nodes: {}}
    ))

  const init = async (node: Element) => {
    try {
      let data = await fetchData()
      let text

      if (data.args.text) {
        const file = await getFile(data, {text: JSON.parse(data.args.text)})
        data = await withFile(data, file)
      } else if (data.args.file) {
        const file = await getFile(data, {path: data.args.file})
        data = await withFile(data, file)
        text = file.text
      } else if (data.path) {
        const file = await getFile(data, {path: data.path})
        data = await withFile(data, file)
        text = file.text
      } else {
        data = withYjs(data)
      }

      const newState: State = {
        ...unwrap(store),
        ...data,
        config: {...data.config, ...getTheme(data)},
        loading: 'initialized'
      }

      if (isTauri && newState.config?.alwaysOnTop) {
        remote.setAlwaysOnTop(true)
      }

      updateEditorState(newState, false, node)
      setState(newState)
      updateText(text)
    } catch (error) {
      setError(error)
    }
  }

  const clean = () => {
    disconnectCollab(store)
    const state: State = withYjs({
      ...createState(),
      collab: {started: false, ydoc: createYdoc()},
      args: {cwd: store.args?.cwd},
      loading: 'initialized',
      files: [],
      fullscreen: store.fullscreen,
      lastModified: new Date(),
      error: undefined,
      excerpt: undefined,
    })

    updateEditorState(state, false)
    setState(state)
    updateText(createEmptyText())
  }

  const discard = async () => {
    if (store.path) {
      await discardText()
    } else if (store.files.length > 0 && isEmpty(store.editorView.state)) {
      await discardText()
    } else if (store.collab.started) {
      await discardText()
    } else if (isEmpty(store.editorView?.state)) {
      newFile()
    } else {
      selectAll(store.editorView.state, store.editorView.dispatch)
      deleteSelection(store.editorView.state, store.editorView.dispatch)
    }

    store.editorView?.focus()
  }

  const newFile = () => {
    const empty = isEmpty(store.editorView?.state)
    const state: State = unwrap(store)
    let files = state.files
    if (!state.error && !empty && !store.path) {
      files = addToFiles(files, state)
    }

    disconnectCollab(state)
    const update = withYjs({
      ...state,
      args: {cwd: state.args?.cwd},
      files,
      lastModified: undefined,
      path: undefined,
      error: undefined,
      markdown: false,
      collab: {room: undefined, ydoc: createYdoc()},
      excerpt: undefined,
    })

    updateEditorState(update, false)
    setState(update)
  }

  const openFile = async (f: File) => {
    const state: State = unwrap(store)
    const file = await getFile(state, f)
    const update = await withFile(state, file)
    updateEditorState(update, false)
    setState(update)
    if (!file.ydoc && file.text) updateText(file.text)
  }

  const setFullscreen = (fullscreen: boolean) => {
    remote.setFullscreen(fullscreen)
    setState({fullscreen})
  }

  const setAlwaysOnTop = (alwaysOnTop: boolean) => {
    remote.setAlwaysOnTop(alwaysOnTop)
    setState('config', {alwaysOnTop})
  }

  const startCollab = () => {
    window.history.replaceState(null, '', `/${store.collab.room}`)
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
        date: state.lastModified.getTime(),
        snapshot: Y.encodeSnapshot(snapshot),
        clientID: ydoc.clientID,
      }])
    }

    saveState(state)
  }

  const renderVersion = (version: any) => {
    setSnapshotView(true)
    const snapshot = Y.decodeSnapshot(version.snapshot)
    const prevSnapshot = Y.emptySnapshot
    const tr = store.editorView.state.tr
    tr.setMeta(ySyncPluginKey, {snapshot, prevSnapshot})
    store.editorView.dispatch(tr)
  }

  const unrenderVersion = () => {
    const state = unwrap(store)
    const binding = ySyncPluginKey.getState(state.editorView.state).binding
    if (binding) binding.unrenderSnapshot()
    setSnapshotView(false)
  }

  const applyVersion = (version: any) => {
    const state = unwrap(store)
    const ydoc = state.collab.ydoc

    const snapshot = Y.decodeSnapshot(version.snapshot)
    const newDoc = Y.createDocFromSnapshot(ydoc, snapshot)
    const node = yDocToProsemirror(state.editorView.state.schema, newDoc)
    unrenderVersion()

    const tr = state.editorView.state.tr
    const slice = new Slice(node.content, 0, 0)
    tr.replace(0, state.editorView.state.doc.content.size, slice)
    state.editorView.dispatch(tr)
  }

  const toggleMarkdown = () => {
    const state: State = unwrap(store)
    const editorState = store.editorView.state
    const markdown = !state.markdown
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
        path: state.path,
        markdown,
        keymap,
      })
      const schema = createSchema(extensions)
      const parser = createMarkdownParser(schema)
      let textContent = ''
      editorState.doc.forEach((node: any) => {
        textContent += `${node.textContent}\n`
      })
      const text = parser.parse(textContent)
      doc = text.toJSON()
    }

    updateEditorState({...state, markdown}, false)
    setState({markdown})
    updateText({...createEmptyText(), doc})
  }

  const updateConfig = (conf: Partial<Config>) => {
    const state: State = unwrap(store)
    if (conf.font) state.collab?.ydoc.getMap('config').set('font', conf.font)
    if (conf.fontSize) state.collab?.ydoc.getMap('config').set('fontSize', conf.fontSize)
    if (conf.contentWidth) state.collab?.ydoc.getMap('config').set('contentWidth', conf.contentWidth)
    const config = {...state.config, ...conf}
    updateEditorState({...state, config})
    setState({config, lastModified: new Date()})
  }

  const updatePath = (path: string) => {
    setState({path, lastModified: new Date()})
  }

  const updateTheme = () => {
    setState('config', getTheme(unwrap(store), true))
  }

  const ctrl = {
    init,
    clean,
    discard,
    newFile,
    openFile,
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
    updatePath,
    updateTheme,
    setState,
  }

  return [store, ctrl]
}
