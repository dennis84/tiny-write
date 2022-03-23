import {Store, createStore, unwrap} from 'solid-js/store'
import {v4 as uuidv4} from 'uuid'
import {EditorState} from 'prosemirror-state'
import {undo, redo} from 'prosemirror-history'
import {selectAll, deleteSelection} from 'prosemirror-commands'
import * as Y from 'yjs'
import {undo as yUndo, redo as yRedo} from 'y-prosemirror'
import {WebsocketProvider} from 'y-websocket'
import {uniqueNamesGenerator, adjectives, animals} from 'unique-names-generator'
import {debounce} from 'ts-debounce'
import * as remote from './remote'
import {createSchema, createState, createEmptyState} from './prosemirror'
import {State, File, Config, ServiceError, newState} from './state'
import {COLLAB_URL, isTauri, mod} from './env'
import {serialize, createMarkdownParser} from './markdown'
import {isDarkTheme, themes} from './config'
import db from './db'
import {isEmpty, isInitialized} from './prosemirror/state'

const isText = (x: any) => x && x.doc && x.selection

const isState = (x: any) =>
  (typeof x.lastModified !== 'string') &&
  Array.isArray(x.files)

const isFile = (x: any): boolean => x && (x.text || x.path)

const isConfig = (x: any): boolean =>
  (typeof x.theme === 'string' || x.theme === undefined) &&
  typeof x.codeTheme === 'string' &&
  typeof x.font === 'string'

export const createCtrl = (initial: State): [Store<State>, any] => {
  const [store, setState] = createStore(initial)

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
    if (!isInitialized(store.text)) return
    const text = store.text as EditorState
    if (store.collab?.started) {
      yUndo(text)
    } else {
      undo(text, store.editorView.dispatch)
    }

    return true
  }

  const onRedo = () => {
    if (!isInitialized(store.text)) return
    const text = store.text as EditorState
    if (store.collab?.started) {
      yRedo(text)
    } else {
      redo(text, store.editorView.dispatch)
    }

    return true
  }

  const keymap = {
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

  const createTextFromFile = async (file: File) => {
    const state = unwrap(store)
    if (file.path) {
      file = await loadFile(state.config, file.path)
    }

    const [text, extensions] = createState({
      data: file.text,
      config: state.config,
      markdown: file.markdown,
      path: file.path,
      keymap,
    })

    return {
      text,
      extensions,
      lastModified: file.lastModified ? new Date(file.lastModified) : undefined,
      path: file.path,
      markdown: file.markdown,
    }
  }

  const addToFiles = (files: File[], prev: State) => {
    const text = prev.path ? undefined : (prev.text as EditorState).toJSON()
    return [...files, {
      text,
      lastModified: prev.lastModified?.toISOString(),
      path: prev.path,
      markdown: prev.markdown,
    }]
  }

  const discardText = async () => {
    const state = unwrap(store)
    const index = state.files.length - 1
    const file = index !== -1 ? state.files[index] : undefined

    let next: Partial<State>
    if (file) {
      next = await createTextFromFile(file)
    } else {
      const [text, extensions] = createEmptyState({
        config: state.config ?? store.config,
        markdown: state.markdown ?? store.markdown,
        keymap,
      })

      next = {
        text,
        extensions,
        lastModified: undefined,
        path: undefined,
        markdown: state.markdown,
      }
    }

    const files = state.files.filter((f: File) => f !== file)

    setState({
      files,
      ...next,
      collab: file ? undefined : state.collab,
      error: undefined,
    })
  }

  const fetchData = async (): Promise<State> => {
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
      return {...state, args}
    }

    const config = {...state.config, ...parsed.config}
    if (!isConfig(config)) {
      throw new ServiceError('invalid_config', config)
    }

    let text = state.text
    let extensions = []
    if (parsed.text) {
      if (!isText(parsed.text)) {
        throw new ServiceError('invalid_state', parsed.text)
      }

      try {
        [text, extensions] = createState({
          data: parsed.text,
          path: parsed.path,
          markdown: parsed.markdown,
          keymap,
          config,
        })
      } catch (err) {
        throw new ServiceError('invalid_state', parsed.text)
      }
    }

    const newState = {
      ...parsed,
      text,
      extensions,
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

    return newState
  }

  const getTheme = (state: State) => {
    const matchDark = window.matchMedia('(prefers-color-scheme: dark)')
    const isDark = matchDark.matches
    if (isDark && !isDarkTheme(state.config.theme)) {
      return {theme: 'dark', codeTheme: 'material-dark'}
    } else if (!isDark && isDarkTheme(state.config.theme)) {
      return {theme: 'light', codeTheme: 'material-light'}
    }

    return {}
  }

  const clean = () => {
    setState({
      ...newState(),
      loading: 'initialized',
      files: [],
      fullscreen: store.fullscreen,
      lastModified: new Date(),
      error: undefined,
      text: undefined,
    })
  }

  const discard = () => {
    console.log(store.path)
    if (store.path) {
      discardText()
    } else if (store.files.length > 0 && isEmpty(store.text)) {
      discardText()
    } else {
      selectAll(store.editorView.state, store.editorView.dispatch)
      deleteSelection(store.editorView.state, store.editorView.dispatch)
    }
  }

  const init = async () => {
    let data = await fetchData()
    try {
      if (data.args.room) {
        data = doStartCollab(data)
      } else if (data.args.text) {
        data = await doOpenFile(data, {text: JSON.parse(data.args.text)})
      } else if (data.args.file) {
        const file = await loadFile(data.config, data.args.file)
        data = await doOpenFile(data, file)
      } else if (data.path) {
        const file = await loadFile(data.config, data.path)
        data = await doOpenFile(data, file)
      } else if (!data.text) {
        const [text, extensions] = createEmptyState({
          config: data.config ?? store.config,
          markdown: data.markdown ?? store.markdown,
          keymap: keymap,
        })
        data = {...data, text, extensions}
      }
    } catch (error) {
      data = {...data, error: error.errorObject}
    }

    setState({
      ...data,
      config: {...data.config, ...getTheme(data)},
      loading: 'initialized'
    })
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
    if (isEmpty(store.text) && !store.path) {
      return
    }

    const state: State = unwrap(store)
    let files = state.files
    if (!state.error) {
      files = addToFiles(files, state)
    }

    const [text, extensions] = createEmptyState({
      config: state.config ?? store.config,
      markdown: state.markdown ?? store.markdown,
      keymap,
    })

    setState({
      text,
      extensions,
      files,
      lastModified: undefined,
      path: undefined,
      error: undefined,
      collab: undefined,
    })
  }

  const openFile = async (file: File) => {
    const state: State = unwrap(store)
    const update = await doOpenFile(state, file)
    setState(update)
  }

  const doOpenFile = async (state: State, file: File): Promise<State> => {
    const findIndexOfFile = (f: File) => {
      for (let i = 0; i < state.files.length; i++) {
        if (state.files[i] === f) return i
        else if (f.path && state.files[i].path === f.path) return i
      }

      return -1
    }

    const index = findIndexOfFile(file)
    const item = index === -1 ? file : state.files[index]
    let files = state.files.filter((f) => f !== item)

    if (!isEmpty(state.text) && state.lastModified) {
      files = addToFiles(files, state)
    }

    file.lastModified = item.lastModified
    const next = await createTextFromFile(file)

    return {
      ...state,
      ...next,
      files,
      collab: undefined,
      error: undefined,
    }
  }

  const saveState = debounce(async (state: State) => {
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

    if (isInitialized(state.text)) {
      if (state.path) {
        const text = serialize(store.editorView.state)
        await remote.writeFile(state.path, text)
      } else {
        data.text = store.editorView.state.toJSON()
      }
    } else if (state.text) {
      data.text = state.text
    }

    db.set('state', JSON.stringify(data))
  }, 200)

  const setFullscreen = (fullscreen: boolean) => {
    remote.setFullscreen(fullscreen)
    setState({fullscreen})
  }

  const startCollab = () => {
    const state: State = unwrap(store)
    const update = doStartCollab(state)
    setState(update)
  }

  const doStartCollab = (state: State): State => {
    const backup = state.args?.room && state.collab.room !== state.args.room
    const room = state.args?.room ?? uuidv4()
    window.history.replaceState(null, '', `/${room}`)

    const ydoc = new Y.Doc()
    const type = ydoc.getXmlFragment('prosemirror')
    const provider = new WebsocketProvider(COLLAB_URL, room, ydoc)

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

    const [, extensions] = createState({
      config: state.config,
      markdown: state.markdown,
      path: state.path,
      keymap,
      y: {type, provider},
    })

    let newState = state
    if ((backup && !isEmpty(state.text)) || state.path) {
      let files = state.files
      if (!state.error) {
        files = addToFiles(files, state)
      }

      newState = {
        ...state,
        files,
        lastModified: undefined,
        path: undefined,
        error: undefined,
      }
    }

    return {
      ...newState,
      extensions,
      collab: {started: true, room, y: {type, provider}}
    }
  }

  const stopCollab = (state: State) => {
    state.collab.y?.provider.destroy()
    const [, extensions] = createState({
      config: state.config,
      markdown: state.markdown,
      path: state.path,
      keymap,
    })

    setState({collab: undefined, extensions})
    window.history.replaceState(null, '', '/')
  }

  const toggleMarkdown = () => {
    const state = unwrap(store)
    const editorState = store.text as EditorState
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
      editorState.doc.forEach((node) => {
        textContent += `${node.textContent}\n`
      })
      const text = parser.parse(textContent)
      doc = text.toJSON()
    }

    const [text, extensions] = createState({
      data: {selection, doc},
      config: state.config,
      markdown,
      path: state.path,
      keymap: keymap,
      y: state.collab?.y,
    })

    setState({
      text,
      extensions,
      markdown,
    })
  }

  const updateConfig = (config: Partial<Config>) => {
    const state = unwrap(store)
    const [, extensions] = createState({
      data: state.text?.toJSON(),
      config: {...state.config, ...config},
      markdown: state.markdown,
      path: state.path,
      keymap,
      y: state.collab?.y,
    })

    setState({
      config: {...state.config, ...config},
      extensions,
      lastModified: new Date(),
    })
  }

  const updatePath = (path: string) => {
    setState({path, lastModified: new Date()})
  }

  const updateTheme = () => {
    setState('config', getTheme(unwrap(store)))
  }

  const ctrl = {
    clean,
    discard,
    init,
    loadFile,
    newFile,
    openFile,
    saveState,
    setFullscreen,
    setState,
    startCollab,
    stopCollab,
    toggleMarkdown,
    updateConfig,
    updatePath,
    updateTheme,
  }

  return [store, ctrl]
}
