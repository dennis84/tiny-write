import React, {MouseEvent, useEffect, useRef} from 'react'
import {selectAll, deleteSelection} from 'prosemirror-commands'
import {EditorView} from 'prosemirror-view'
import {undo, redo} from 'prosemirror-history'
import {v4 as uuidv4} from 'uuid'
import * as Y from 'yjs'
import {undo as yUndo, redo as yRedo} from 'y-prosemirror'
import {WebsocketProvider} from 'y-websocket'
import {listen} from '@tauri-apps/api/event'
import {convertFileSrc} from '@tauri-apps/api/tauri'
import {Args, State} from '..'
import * as remote from '../remote'
import db from '../db'
import {COLLAB_URL, isTauri, mod} from '../env'
import {isDarkTheme} from '../config'
import {useDebouncedEffect, useDynamicCallback} from '../hooks'
import {serialize, createMarkdownParser} from '../markdown'
import {
  UpdateConfig,
  UpdateState,
  UpdateError,
  UpdateText,
  UpdateCollab,
  UpdateLoading,
  New,
  Discard,
  ToggleFullscreen,
  Open,
  useDispatch,
} from '../reducer'
import {Layout} from './Layout'
import Editor from './Editor'
import Menu from './Menu'
import {isEmpty, isInitialized} from '../prosemirror/state'
import {insertImage} from '../prosemirror/extension/image'
import {
  createSchema,
  createState,
  createEmptyData,
  createEmptyState,
} from '../prosemirror'

const isText = (x: any) => x && x.doc && x.selection

const isState = (x: any) =>
  (typeof x.lastModified !== 'string') &&
  Array.isArray(x.files)

const isFile = (x: any): boolean => x.text || x.path

const isConfig = (x: any): boolean =>
  (typeof x.theme === 'string' || x.theme === undefined) &&
  typeof x.codeTheme === 'string' &&
  typeof x.font === 'string'

interface Props {
  state: State;
  editorViewRef: React.RefObject<EditorView>;
}

export default (props: Props) => {
  const dispatch = useDispatch()
  const editorView = props.editorViewRef.current
  const mouseEnterCoords = useRef({x: 0, y: 0})

  const onQuit = () => {
    if (!isTauri) return
    remote.quit()
  }

  const onNew = useDynamicCallback(() => {
    dispatch(New)
    return true
  })

  const onDiscard = useDynamicCallback((_editorState, _editorDispatch, view) => {
    if (props.state.path) {
      dispatch(Discard)
    } else if (props.state.files.length > 0 && isEmpty(editorView.state)) {
      dispatch(Discard)
    } else {
      selectAll(view.state, view.dispatch)
      deleteSelection(view.state, view.dispatch)
    }

    return true
  })

  const onFullscreen = useDynamicCallback(() => {
    if (!isTauri) return
    dispatch(ToggleFullscreen)
    return true
  })

  const onUndo = useDynamicCallback(() => {
    if (!editorView) return
    if (props.state.collab?.started) {
      yUndo(editorView.state)
    } else {
      undo(editorView.state, editorView.dispatch)
    }

    return true
  })

  const onRedo = useDynamicCallback(() => {
    if (!editorView) return
    if (props.state.collab?.started) {
      yRedo(editorView.state)
    } else {
      redo(editorView.state, editorView.dispatch)
    }

    return true
  })

  const onToggleMarkdown = useDynamicCallback(() => {
    const markdown = !props.state.markdown
    const selection = {type: 'text', anchor: 1, head: 1}
    let doc: any

    if (markdown) {
      const lines = serialize(editorView.state).split('\n')
      const nodes = lines.map((text) => {
        return text ? {type: 'paragraph', content: [{type: 'text', text}]} : {type: 'paragraph'}
      })

      doc = {type: 'doc', content: nodes}
    } else {
      const schema = createSchema({
        config: props.state.config,
        markdown,
        path: props.state.path,
        keymap: keymap,
        y: props.state.collab?.y,
      })

      const parser = createMarkdownParser(schema)
      let textContent = ''
      editorView.state.doc.forEach((node) => {
        textContent += `${node.textContent.trim()}\n`
      })
      const text = parser.parse(textContent)
      doc = text.toJSON()
    }

    const text = createState({
      data: {selection, doc},
      config: props.state.config,
      markdown,
      path: props.state.path,
      keymap: keymap,
      y: props.state.collab?.y,
    })

    dispatch(UpdateText(text, undefined, markdown))
    return true
  })

  const onMouseEnter = (e: MouseEvent) => {
    mouseEnterCoords.current = {x: e.pageX, y: e.pageY}
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

  const loadFile = async () => {
    try {
      const fileContent = await remote.readFile(props.state.path)
      const schema = createSchema({
        config: props.state.config,
        markdown: false,
        path: props.state.path,
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

      const newText = createState({
        data: text,
        config: props.state.config,
        markdown: false,
        path: props.state.path,
        keymap,
      })

      const lastModified = new Date() // file lastModified
      dispatch(UpdateText(newText, lastModified))
    } catch (e) {
      dispatch(Discard)
      return
    }
  }

  const initialize = async () => {
    let args = await remote.getArgs().catch(() => undefined)
    if (!isTauri) {
      const room = window.location.pathname?.slice(1)
      args = {room}
    }

    const data = await db.get('state')
    let parsed: any
    if (data !== undefined) {
      try {
        parsed = JSON.parse(data)
      } catch (err) {
        dispatch(UpdateError({id: 'invalid_state', props: data}))
        return
      }
    }

    if (!parsed) {
      dispatch(UpdateState({
        ...props.state,
        args,
        loading: 'roundtrip',
      }))
      return
    }

    const config = {...props.state.config, ...parsed.config}
    if (!isConfig(config)) {
      dispatch(UpdateError({id: 'invalid_config', props: config}))
      return
    }

    let text: any
    if (parsed.text) {
      if (!isText(parsed.text)) {
        dispatch(UpdateError({id: 'invalid_state', props: parsed.text}))
        return
      }

      try {
        text = createState({
          data: parsed.text,
          path: parsed.path,
          markdown: parsed.markdown,
          keymap,
          config,
        })
      } catch (err) {
        dispatch(UpdateError({id: 'invalid_file', props: parsed.text}))
        return
      }
    }

    const newState = {
      ...props.state,
      ...parsed,
      text,
      config,
      loading: 'roundtrip',
      args,
    }

    if (newState.lastModified) {
      newState.lastModified = new Date(newState.lastModified)
    }

    for (const file of parsed.files) {
      if (!isFile(file)) {
        dispatch(UpdateError({id: 'invalid_file', props: file}))
      }
    }

    if (!isState(newState)) {
      dispatch(UpdateError({id: 'invalid_state', props: newState}))
      return
    }

    dispatch(UpdateState(newState))
  }

  const onArgs = useDynamicCallback(async (args: Args) => {
    if (!props.state.collab?.started && args.room) {
      const backup = props.state.collab?.room !== args.room
      dispatch(UpdateCollab({room: args.room, started: true}, undefined, backup))
      return
    }

    if (args.text) {
      dispatch(Open({
        text: JSON.parse(args.text),
      }))
    } else if (args.file) {
      if (args.file === props.state.path) {
        await loadFile()
        return
      }

      dispatch(Open({
        path: args.file,
      }))
    }
  })

  // On mount, load state from DB.
  useEffect(() => {
    initialize()
  }, [])

  // Handle dark mode
  useEffect(() => {
    if (!window.matchMedia) return
    if (props.state.loading !== 'initialized') return

    const matchDark = () => window.matchMedia('(prefers-color-scheme: dark)')

    const handleTheme = () => {
      const isDark = matchDark().matches
      if (isDark && !isDarkTheme(props.state.config)) {
        dispatch(UpdateConfig({...props.state.config, theme: 'dark'}, props.state.lastModified))
      } else if (!isDark && isDarkTheme(props.state.config)) {
        dispatch(UpdateConfig({...props.state.config, theme: 'light'}, props.state.lastModified))
      }
    }

    matchDark().addEventListener('change', handleTheme)
    handleTheme()

    return () => {
      matchDark().removeEventListener('change', handleTheme)
    }
  }, [props.state.loading])

  // Handle tauri file drop
  useEffect(() => {
    if (!isTauri) return
    if (props.state.loading !== 'initialized') return
    listen('tauri://file-drop', async (event) => {
      for (const path of (event.payload as string[])) {
        const mime = await remote.getMimeType(path)
        if (mime.startsWith('image/')) {
          const {x, y} = mouseEnterCoords.current
          insertImage(editorView, convertFileSrc(path), x, y)
        } else if (mime.startsWith('text/')) {
          dispatch(Open({path}))
          return
        }
      }
    })
  }, [props.state.loading])

  // After initialization is completed
  useEffect(() => {
    if (props.state.loading === 'roundtrip') {
      dispatch(UpdateLoading('initialized'))
    } else if (props.state.loading === 'initialized') {
      if (
        props.state.args?.file ||
        props.state.args?.room ||
        props.state.args?.text
      ) {
        onArgs(props.state.args)
        return
      }

      if (props.state.path) {
        loadFile()
      }
    }
  }, [props.state.loading])

  // If collab is started
  useEffect(() => {
    if (props.state.loading !== 'initialized') return
    if (props.state.collab?.started) {
      const room = props.state.collab?.room ?? uuidv4()
      window.history.replaceState(null, '', `/${room}`)

      const ydoc = new Y.Doc()
      const type = ydoc.getXmlFragment('prosemirror')
      const provider = new WebsocketProvider(COLLAB_URL, room, ydoc)

      const newText = createState({
        data: props.state.collab?.room ? createEmptyData() : editorView.state.toJSON(),
        config: props.state.config,
        markdown: props.state.markdown,
        path: props.state.path,
        keymap,
        y: {type, provider},
      })

      dispatch(UpdateCollab({
        ...props.state.collab,
        room,
        y: {type, provider},
      }, newText))

      return
    }

    if (props.state.collab) {
      props.state.collab?.y?.provider.destroy()

      // Recreate editorState without collab plugin.
      const newText = createState({
        data: editorView.state.toJSON(),
        config: props.state.config,
        markdown: props.state.markdown,
        path: props.state.path,
        keymap,
      })

      dispatch(UpdateCollab({
        started: false,
        error: props.state.collab.error,
      }, newText))
    }

    window.history.replaceState(null, '', '/')
  }, [props.state.collab?.started])

  // Load file if path has changed
  useEffect(() => {
    if (props.state.path && props.state.loading === 'initialized') {
      loadFile()
    }
  }, [props.state.path])

  // Recreate prosemirror if config properties has changed
  // which need a full recreation of extensions.
  useEffect(() => {
    if (!isInitialized(props.state.text?.editorState)) return
    const newText = createState({
      data: editorView.state.toJSON(),
      config: props.state.config,
      markdown: props.state.markdown,
      path: props.state.path,
      keymap,
      y: props.state.collab?.y,
    })

    dispatch(UpdateText(newText))
  }, [
    props.state.config.codeTheme,
    props.state.config.fontSize,
    props.state.config.typewriterMode,
    props.state.config.prettier,
  ])

  // Toggle remote fullscreen if changed
  useEffect(() => {
    if (props.state.loading !== 'initialized') return
    remote.setFullscreen(props.state.fullscreen)
  }, [props.state.fullscreen])

  // Toggle remote alwaysOnTop if changed
  useEffect(() => {
    if (!isTauri) return
    remote.setAlwaysOnTop(props.state.config.alwaysOnTop)
  }, [props.state.config.alwaysOnTop])

  // Save state in DB if lastModified has changed
  useDebouncedEffect(async () => {
    if (
      props.state.loading !== 'initialized' ||
      !isInitialized(props.state.text?.editorState) ||
      !props.state.lastModified
    ) return

    const data: any = {
      lastModified: props.state.lastModified,
      files: props.state.files,
      config: props.state.config,
      path: props.state.path,
      markdown: props.state.markdown,
      collab: {
        room: props.state.collab?.room
      }
    }

    if (props.state.path) {
      const text = serialize(editorView.state)
      await remote.writeFile(props.state.path, text)
    } else {
      data.text = editorView.state.toJSON()
    }

    db.set('state', JSON.stringify(data))
  }, 100, [props.state.lastModified])

  const editorState = props.state.text ?? createEmptyState({
    config: props.state.config,
    markdown: props.state.markdown,
    keymap,
  })

  return (
    <Layout
      data-testid={props.state.loading}
      onMouseEnter={onMouseEnter}>
      <Editor
        editorViewRef={props.editorViewRef}
        text={editorState}
        lastModified={props.state.lastModified}
        files={props.state.files}
        config={props.state.config}
        path={props.state.path}
        collab={props.state.collab}
        markdown={props.state.markdown}
        keymap={keymap} />
      <Menu
        editorViewRef={props.editorViewRef}
        text={editorState}
        lastModified={props.state.lastModified}
        path={props.state.path}
        files={props.state.files}
        config={props.state.config}
        fullscreen={props.state.fullscreen}
        collab={props.state.collab}
        markdown={props.state.markdown}
        onToggleMarkdown={onToggleMarkdown} />
    </Layout>
  )
}
