import {Store, createStore, unwrap} from 'solid-js/store'
import {v4 as uuidv4} from 'uuid'
import {EditorView} from 'prosemirror-view'
import {EditorState, Transaction} from 'prosemirror-state'
import {Schema} from 'prosemirror-model'
import {undo, redo} from 'prosemirror-history'
import {selectAll, deleteSelection} from 'prosemirror-commands'
import * as Y from 'yjs'
import {undo as yUndo, redo as yRedo, prosemirrorToYDoc} from 'y-prosemirror'
import {WebsocketProvider} from 'y-websocket'
import {uniqueNamesGenerator, adjectives, animals} from 'unique-names-generator'
import {debounce} from 'ts-debounce'
import * as remote from './remote'
import {createSchema, createExtensions, createEmptyText} from './prosemirror'
import {State, File, Collab, Config, ServiceError, newState} from './state'
import {COLLAB_URL, isTauri, mod} from './env'
import {serialize, createMarkdownParser} from './markdown'
import {isDarkTheme, themes} from './config'
import * as db from './db'
import {
  NodeViewFn,
  ProseMirrorExtension,
  ProseMirrorState,
  isEmpty,
} from './prosemirror/state'

const isText = (x: any) => x && x.doc && x.selection

const isState = (x: any) =>
  (typeof x.lastModified !== 'string') &&
  Array.isArray(x.files)

const isFile = (x: any): boolean => x && (x.text || x.path || x.ydoc)

const isConfig = (x: any): boolean =>
  (typeof x.theme === 'string' || x.theme === undefined) &&
  (typeof x.codeTheme === 'string' || x.codeTheme === undefined) &&
  typeof x.font === 'string'

export const createCtrl = (initial: State): [Store<State>, any] => {
  const [store, setState] = createStore(initial)
  const initialEditorState = {text: undefined, extensions: undefined}

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

  const onToggleMarkdown = () => toggleMarkdown()

  const onUndo = () => {
    if (!store.editorView) return
    if (store.collab?.started) {
      yUndo(store.editorView.state)
    } else {
      undo(store.editorView.state, store.editorView.dispatch)
    }

    return true
  }

  const onRedo = () => {
    if (!store.editorView) return
    if (store.collab?.started) {
      yRedo(store.editorView.state)
    } else {
      redo(store.editorView.state, store.editorView.dispatch)
    }

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
    [`${mod}-m`]: onToggleMarkdown,
  }

  const addToFiles = (
    files: File[],
    prev: State,
    prevYdoc?: Uint8Array,
  ) => {
    let text, ydoc
    if (prevYdoc || prev.collab?.room) {
      ydoc = prevYdoc ?? Y.encodeStateAsUpdate(prev.collab.y.provider.doc)
    } else {
      text = prev.path ? undefined : store.editorView?.state.toJSON()
    }

    return [...files, {
      text,
      ydoc,
      lastModified: prev.lastModified?.toISOString(),
      path: prev.path,
      markdown: prev.markdown,
      ...(prev.collab?.room ? {collab: {room: prev.collab.room}} : {}),
    }]
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
      collab: {room: file.collab?.room},
      args: {cwd: state.args?.cwd},
    }

    disconnectCollab(state.collab)
    let newState = {...state, ...next}
    newState = doStartCollab(newState, undefined, file.ydoc)
    updateEditorState(newState, file.text ?? createEmptyText())

    setState({
      args: {cwd: state.args?.cwd},
      collab: undefined,
      error: undefined,
      ...newState,
      files,
    })
  }

  const fetchData = async (): Promise<[State, ProseMirrorState, Uint8Array]> => {
    let args = await remote.getArgs().catch(() => undefined)
    const state: State = unwrap(store)

    if (!isTauri) {
      const room = window.location.pathname?.slice(1).trim()
      args = {room: room ? room : undefined}
    }
    const data = await db.get('state')
    let parsed: any
    if (data !== undefined) {
      try {
        parsed = JSON.parse(data)
      } catch (err) {
        throw new ServiceError('invalid_state', data)
      }
    }

    if (!parsed) {
      return [{...state, args}, undefined, undefined]
    }

    const config = {...state.config, ...parsed.config}
    if (!isConfig(config)) {
      throw new ServiceError('invalid_config', config)
    }

    let text: any
    if (parsed.text) {
      if (!isText(parsed.text)) {
        throw new ServiceError('invalid_state', parsed.text)
      }

      text = parsed.text
    }

    const newState = {
      ...parsed,
      config,
      args,
    }

    if (newState.lastModified) {
      newState.lastModified = new Date(newState.lastModified)
    }

    for (const file of parsed.files) {
      if (!isFile(file)) {
        throw new ServiceError('invalid_file', file)
      }
    }

    if (!isState(newState)) {
      throw new ServiceError('invalid_state', newState)
    }

    return [newState, text, parsed.ydoc]
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

  const clean = () => {
    disconnectCollab(unwrap(store.collab))
    const state: State = {
      ...newState(),
      args: {cwd: store.args?.cwd},
      loading: 'initialized',
      files: [],
      fullscreen: store.fullscreen,
      lastModified: new Date(),
      error: undefined,
      collab: undefined,
    }
    updateEditorState(state, createEmptyText())
    setState(state)
  }

  const discard = async () => {
    if (store.path || store.collab?.room) {
      await discardText()
    } else if (store.files.length > 0 && isEmpty(store.editorView.state)) {
      await discardText()
    } else if (isEmpty(store.editorView?.state)) {
      newFile()
    } else {
      selectAll(store.editorView.state, store.editorView.dispatch)
      deleteSelection(store.editorView.state, store.editorView.dispatch)
    }

    store.editorView?.focus()
  }

  const init = async () => {
    try {
      const result = await fetchData()
      let data = result[0]
      let text = result[1]
      const ydoc = result[2]
      if (data.collab?.room || data.args.room) {
        data = doStartCollab(data, undefined, ydoc)
      } else if (data.args.text) {
        data = await doOpenFile(data, {text: JSON.parse(data.args.text)})
      } else if (data.args.file) {
        const file = await loadFile(data.config, data.args.file)
        data = await doOpenFile(data, file)
        text = file.text
      } else if (data.path) {
        const file = await loadFile(data.config, data.path)
        data = await doOpenFile(data, file)
        text = file.text
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

      updateEditorState(newState, text ?? createEmptyText())
      setState(newState)
    } catch (error) {
      if (error instanceof ServiceError) {
        setState({error: error.errorObject, loading: 'initialized'})
      } else {
        setState({error: {id: 'exception', props: {error}}, loading: 'initialized'})
      }
    }
  }

  const loadFile = async (config: Config, path: string): Promise<File> => {
    try {
      const fileContent = await remote.readFile(path)
      const lastModified = await remote.getFileLastModified(path)
      const schema = createSchema({
        config,
        markdown: false,
        path,
        keymap,
      })

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

  const newFile = () => {
    const empty = isEmpty(store.editorView?.state)
    const state: State = unwrap(store)
    let files = state.files
    if (!state.error && !empty && !store.path) {
      files = addToFiles(files, state)
    }

    const update = {
      ...state,
      args: {cwd: state.args?.cwd},
      files,
      lastModified: undefined,
      path: undefined,
      collab: undefined,
      error: undefined,
    }

    disconnectCollab(state.collab)
    updateEditorState(update, createEmptyText())
    setState(update)
  }

  const openFile = async (file: File) => {
    const state: State = unwrap(store)
    const update = await doOpenFile(state, file)
    setState(update)
  }

  const doOpenFile = async (state: State, f: File): Promise<State> => {
    const findIndexOfFile = (f: File) => {
      for (let i = 0; i < state.files.length; i++) {
        if (state.files[i] === f) return i
        else if (f.path && state.files[i].path === f.path) return i
      }

      return -1
    }

    const index = findIndexOfFile(f)
    let file = index === -1 ? f : state.files[index]
    let files = state.files.filter((f) => f !== file)

    if (!isEmpty(state.editorView?.state) && state.lastModified) {
      files = addToFiles(files, state)
    }

    if (!file.text && file?.path) {
      file = await loadFile(state.config, file.path)
    }

    const next: Partial<State> = {
      lastModified: file.lastModified ? new Date(file.lastModified) : undefined,
      path: file.path,
      markdown: file.markdown,
      ...(file.collab?.room ? {collab: {room: file.collab.room}} : {}),
    }

    let newState: State = {
      ...state,
      args: {cwd: state.args?.cwd},
      files,
      collab: undefined,
      error: undefined,
      ...next,
    }

    disconnectCollab(state.collab)
    newState = doStartCollab(newState, undefined, file.ydoc)
    updateEditorState(newState, file.text ?? createEmptyText())
    return newState
  }

  const saveState = debounce(async (state: State) => {
    if (!state.editorView) {
      return
    }

    const data: any = {
      lastModified: state.lastModified,
      files: state.files,
      config: state.config,
      path: state.path,
      markdown: state.markdown,
      collab: {
        room: state.collab?.room
      }
    }

    if (state.path) {
      const text = serialize(store.editorView.state)
      await remote.writeFile(state.path, text)
    } else if (state.collab?.room) {
      data.ydoc = Y.encodeStateAsUpdate(state.collab.y.provider.doc)
    } else {
      data.text = store.editorView.state.toJSON()
    }

    db.set('state', JSON.stringify(data))
  }, 200)

  const setAlwaysOnTop = (alwaysOnTop: boolean) => {
    remote.setAlwaysOnTop(alwaysOnTop)
    setState('config', {alwaysOnTop})
  }

  const setFullscreen = (fullscreen: boolean) => {
    remote.setFullscreen(fullscreen)
    setState({fullscreen})
  }

  const shouldBackup = (state: State, ydoc?: Uint8Array) => {
    return state.path || (
      state.args?.room &&
      state.collab?.room !== state.args.room &&
      (!isEmpty(state.editorView?.state) || ydoc)
    )
  }

  const startCollab = () => {
    const state: State = unwrap(store)
    const update = doStartCollab(state, uuidv4())
    updateEditorState(update)
    setState(update)
  }

  const onCollabConfigUpdate = (event: any) => {
    const font = event.target.get('font') as string
    const fontSize = event.target.get('fontSize') as number
    const contentWidth = event.target.get('contentWidth') as number
    setState('config', {font, fontSize, contentWidth})
  }

  const doStartCollab = (
    state: State,
    newRoom?: string,
    savedDoc?: Uint8Array,
  ): State => {
    const room = newRoom ?? state.args?.room ?? state.collab?.room
    if (!room) return state

    window.history.replaceState(null, '', `/${room}`)

    let ydoc = new Y.Doc()
    if (room === state.collab?.room && savedDoc) {
      Y.applyUpdate(ydoc, savedDoc)
    } else if (state.editorView) {
      ydoc = prosemirrorToYDoc(state.editorView.state.doc)
    }

    const prosemirrorType = ydoc.getXmlFragment('prosemirror')
    const provider = new WebsocketProvider(COLLAB_URL, room, ydoc)
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
    });

    provider.awareness.setLocalStateField('user', {
      name: username,
      background: xs[index].primaryBackground,
      foreground: xs[index].primaryForeground,
    })

    let newState = state
    if (shouldBackup(state, savedDoc)) {
      let files = state.files
      if (!state.error) {
        files = addToFiles(files, state, savedDoc)
      }

      newState = {
        ...newState,
        files,
        lastModified: undefined,
        path: undefined,
        error: undefined,
      }
    }

    return {
      ...newState,
      collab: {
        started: true,
        room,
        y: {prosemirrorType, configType, provider}
      }
    }
  }

  const disconnectCollab = (collab?: Collab) => {
    collab?.y?.provider.destroy()
    collab?.y?.configType.unobserve(onCollabConfigUpdate)
    window.history.replaceState(null, '', '/')
  }

  const toggleMarkdown = () => {
    const state: State = unwrap(store)
    const editorState = store.editorView.state
    const markdown = !state.markdown
    const selection = {type: 'text', anchor: 1, head: 1}
    let doc: any

    if (markdown) {
      const lines = serialize(editorState).split('\n')
      const nodes = lines.map((text) => {
        return text ? {type: 'paragraph', content: [{type: 'text', text}]} : {type: 'paragraph'}
      })

      doc = {type: 'doc', content: nodes}
    } else {
      const schema = createSchema({
        config: state.config,
        path: state.path,
        y: state.collab?.y,
        markdown,
        keymap,
      })

      const parser = createMarkdownParser(schema)
      let textContent = ''
      editorState.doc.forEach((node: any) => {
        textContent += `${node.textContent}\n`
      })
      const text = parser.parse(textContent)
      doc = text.toJSON()
    }

    updateEditorState({...state, markdown}, {selection, doc})
    setState({markdown})
  }

  const updateConfig = (conf: Partial<Config>) => {
    const state: State = unwrap(store)
    state.collab?.y?.configType.set('font', conf.font)
    state.collab?.y?.configType.set('fontSize', conf.fontSize)
    state.collab?.y?.configType.set('contentWidth', conf.contentWidth)
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

  const createEditorView = (elem: HTMLElement) => {
    const {text, extensions} = initialEditorState
    const {editorState, nodeViews} = createEditorState(text, extensions)
    const dispatchTransaction = (tr: Transaction) => {
      if (!store.editorView) return
      const newState = store.editorView.state.apply(tr)
      store.editorView.updateState(newState)
      if (!tr.docChanged) return
      setState({lastModified: new Date()})
    }

    const editorView = new EditorView(elem, {
      state: editorState,
      nodeViews,
      dispatchTransaction,
    })

    setState({editorView})
    setTimeout(() => editorView.focus())
  }

  const updateEditorState = (state: State, text?: ProseMirrorState) => {
    const extensions = createExtensions({
      config: state.config ?? store.config,
      markdown: state.markdown ?? store.markdown,
      path: state.path ?? store.path,
      keymap,
      ...(state.collab?.y?.prosemirrorType ? {y: state.collab.y} : {}),
    })

    // Save text and extensions for first render
    if (!state.editorView) {
      initialEditorState.text = text
      initialEditorState.extensions = extensions
      return
    } else {
      delete initialEditorState.text
      delete initialEditorState.extensions
    }

    const t = text ?? store.editorView.state
    const {editorState, nodeViews} = createEditorState(t, extensions, store.editorView.state)
    store.editorView.setProps({state: editorState, nodeViews})
    store.editorView.focus()
  }

  const ctrl = {
    clean,
    discard,
    init,
    loadFile,
    newFile,
    openFile,
    saveState,
    setAlwaysOnTop,
    setFullscreen,
    setState,
    startCollab,
    toggleMarkdown,
    updateConfig,
    updatePath,
    updateTheme,
    createEditorView,
    updateEditorState,
  }

  return [store, ctrl]
}

const createEditorState = (
  text: ProseMirrorState,
  extensions: ProseMirrorExtension[],
  prevText?: EditorState
): {
  editorState: EditorState;
  nodeViews: {[key: string]: NodeViewFn};
} => {
  const reconfigure = text instanceof EditorState && prevText?.schema
  let schemaSpec = {nodes: {}}
  let nodeViews = {}
  let plugins = []

  for (const extension of extensions) {
    if (extension.schema) {
      schemaSpec = extension.schema(schemaSpec)
    }

    if (extension.nodeViews) {
      nodeViews = {...nodeViews, ...extension.nodeViews}
    }
  }

  const schema = reconfigure ? prevText?.schema : new Schema(schemaSpec)
  for (const extension of extensions) {
    if (extension.plugins) {
      plugins = extension.plugins(plugins, schema)
    }
  }

  let editorState: EditorState
  if (reconfigure) {
    editorState = text.reconfigure({schema, plugins})
  } else if (text instanceof EditorState) {
    editorState = EditorState.fromJSON({schema, plugins}, text.toJSON())
  } else {
    editorState = EditorState.fromJSON({schema, plugins}, text)
  }

  return {editorState, nodeViews}
}
