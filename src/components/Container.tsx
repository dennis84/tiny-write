import React, {useEffect} from 'react'
import {selectAll, deleteSelection} from 'prosemirror-commands'
import {EditorView} from 'prosemirror-view'
import {undo, redo} from 'prosemirror-history'
import {v4 as uuidv4} from 'uuid'
import * as Y from 'yjs'
import {undo as yUndo, redo as yRedo} from 'y-prosemirror'
import {WebsocketProvider} from 'y-websocket'
import {Args, State} from '..'
import * as remote from '../remote'
import db from '../db'
import {COLLAB_URL, isElectron, mod} from '../env'
import {useDebouncedEffect, useDynamicCallback} from '../hooks'
import {serialize} from '../markdown'
import {
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
import {Layout, Resizer} from './Layout'
import Editor from './Editor'
import ErrorView from './Error'
import Menu from './Menu'
import {isEmpty, isInitialized} from '../prosemirror/prosemirror'
import {createParser} from '../prosemirror/paste-markdown'
import {createState, createEmptyData, createEmptyState} from '../prosemirror'

const isText = (x: any) => x && x.doc && x.selection

const isState = (x: any) =>
  (typeof x.lastModified !== 'string') &&
  Array.isArray(x.files)

const isFile = (x: any): boolean => x.text || x.path

const isConfig = (x: any): boolean =>
  typeof x.theme === 'string' &&
  typeof x.codeTheme === 'string' &&
  typeof x.font === 'string'

interface Props {
  state: State;
  editorViewRef: React.RefObject<EditorView>;
}

export default (props: Props) => {
  const dispatch = useDispatch()
  const editorView = props.editorViewRef.current

  const onNew = useDynamicCallback(() => {
    dispatch(New)
    return true
  })

  const onDiscard = useDynamicCallback((editorState, editorDispatch, view) => {
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

  const keymap = {
    [`${mod}-n`]: onNew,
    [`${mod}-w`]: onDiscard,
    'Cmd-Enter': onFullscreen,
    'Alt-Enter': onFullscreen,
    [`${mod}-z`]: onUndo,
    [`Shift-${mod}-z`]: onRedo,
    [`${mod}-y`]: onRedo,
  }

  const onDrop = (e) => {
    if (
      e.dataTransfer.files.length !== 1 ||
      !e.dataTransfer.files[0].type.startsWith('text/')
    ) return

    dispatch(Open({
      path: e.dataTransfer.files[0].path,
    }))
  }

  const loadFile = async () => {
    const fileExists = await remote.fileExists(props.state.path)
    if (!fileExists) {
      dispatch(Discard)
      return
    }

    const decoder = new TextDecoder('utf-8')
    const data = await remote.readFile(props.state.path)
    const fileContent = decoder.decode(data.buffer)
    const schema = editorView.state.schema
    const parser = createParser(schema)
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
      path: props.state.path,
      keymap,
    })

    const lastModified = new Date(data.lastModified)
    dispatch(UpdateText(newText, lastModified))
  }

  const initialize = async () => {
    const args = await remote.getArgs()
    const data = await db.get('state')
    let parsed
    if (data !== undefined) {
      try {
        parsed = JSON.parse(data)
      } catch (err) {
        dispatch(UpdateError({id: 'invalid_state', props: data}))
        return
      }
    }

    if (!parsed) {
      dispatch(UpdateState({...props.state, loading: 'roundtrip'}))
      return
    }

    const config = {...props.state.config, ...parsed.config}
    if (!isConfig(config)) {
      dispatch(UpdateError({id: 'invalid_config', props: config}))
      return
    }

    let text
    if (parsed.text) {
      if (!isText(parsed.text)) {
        dispatch(UpdateError({id: 'invalid_state', props: parsed.text}))
        return
      }

      try {
        text = createState({
          data: parsed.text,
          path: parsed.path,
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

    if (args.file) {
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

  // After initialization is completed
  useEffect(() => {
    if (props.state.loading === 'roundtrip') {
      dispatch(UpdateLoading('initialized'))
    }

    if (props.state.loading === 'initialized') {
      if (props.state.args) {
        onArgs(props.state.args)
      }

      remote.on('second-instance', onArgs)

      const room = window.location.pathname?.slice(1)
      if (!isElectron && room) {
        const backup = props.state.collab?.room !== room
        dispatch(UpdateCollab({room, started: true}, undefined, backup))
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
      path: props.state.path,
      keymap,
      y: props.state.collab?.y,
    })

    dispatch(UpdateText(newText))
  }, [
    props.state.config.codeTheme,
    props.state.config.fontSize,
    props.state.config.typewriterMode,
  ])

  // Toggle remote fullscreen if changed
  useEffect(() => {
    if (props.state.loading !== 'initialized') return
    remote.setFullscreen(props.state.fullscreen)
  }, [props.state.fullscreen])

  // Toggle remote alwaysOnTop if changed
  useEffect(() => {
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
    keymap,
  })

  return (
    <Layout data-testid={props.state.loading} onDrop={onDrop}>
      {(props.state.error) ? (
        <ErrorView error={props.state.error} />
      ) : (
        <>
          <Editor
            editorViewRef={props.editorViewRef}
            text={editorState}
            lastModified={props.state.lastModified}
            files={props.state.files}
            config={props.state.config} />
          <Menu
            editorViewRef={props.editorViewRef}
            text={editorState}
            lastModified={props.state.lastModified}
            path={props.state.path}
            files={props.state.files}
            config={props.state.config}
            fullscreen={props.state.fullscreen}
            collab={props.state.collab} />
          {isElectron && <Resizer />}
        </>
      )}
    </Layout>
  )
}
