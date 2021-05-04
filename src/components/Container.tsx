import React, {useEffect} from 'react'
import {selectAll, deleteSelection} from 'prosemirror-commands'
import {Step} from 'prosemirror-transform'
import {sendableSteps, getVersion, receiveTransaction} from 'prosemirror-collab'
import {EditorView} from 'prosemirror-view'
import {undo, redo} from 'prosemirror-history'
import {io} from 'socket.io-client'
import {Args, State} from '..'
import * as remote from '../remote'
import db from '../db'
import {isElectron, mod, COLLAB_URL} from '../env'
import {useDebouncedEffect, useDynamicCallback} from '../hooks'
import {markdownSerializer} from '../markdown'
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
import {isEmpty} from '../prosemirror/prosemirror'
import {createParser} from '../prosemirror/paste-markdown'
import {createState, createEmptyState} from '../prosemirror'

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

  const OnNew = useDynamicCallback(() => {
    dispatch(New)
    return true
  })

  const OnDiscard = useDynamicCallback((editorState, editorDispatch, view) => {
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

  const OnFullscreen = useDynamicCallback(() => {
    dispatch(ToggleFullscreen)
    return true
  })

  const OnUndo = useDynamicCallback(() => {
    if (!editorView) return
    undo(editorView.state, editorView.dispatch)
    return true
  })

  const OnRedo = useDynamicCallback(() => {
    if (!editorView) return
    redo(editorView.state, editorView.dispatch)
    return true
  })

  const keymap = {
    [`${mod}-n`]: OnNew,
    [`${mod}-w`]: OnDiscard,
    'Cmd-Enter': OnFullscreen,
    'Alt-Enter': OnFullscreen,
    [`${mod}-z`]: OnUndo,
    [`Shift-${mod}-z`]: OnRedo,
    [`${mod}-y`]: OnRedo,
  }

  const getCurrentVersion = () => {
    try {
      return getVersion(editorView.state)
    } catch(err) {
      return undefined
    }
  }

  const getSendableSteps = () => {
    try {
      return sendableSteps(editorView.state)
    } catch(err) {
      return undefined
    }
  }

  // Receive update response after create and recreate the state.
  const OnReceiveUpdate = useDynamicCallback((data: any) => {
    window.history.replaceState(null, '', `/${data.room}`)

    // Init room if message is from us and collab plugin is not initialized
    if (!props.state.collab.initialized && data.clientID === props.state.collab.socket.id) {
      // Recreate editorState with enabled collab plugin
      const newText = createState({
        data: data.created ? editorView.state.toJSON() : {
          selection: {type: 'text', anchor: 1, head: 1},
          doc: data.doc,
        },
        config: props.state.config,
        path: props.state.path,
        keymap,
        collab: {
          version: data.version,
          clientID: data.clientID,
        }
      })

      // Create new file if we're not the creator
      const backup = !data.created
      dispatch(UpdateCollab({
        ...props.state.collab,
        room: data.room,
        users: data.users,
        initialized: true,
      }, newText, backup))

      return
    }

    // Only update users
    dispatch(UpdateCollab({
      ...props.state.collab,
      users: data.users,
    }))
  })

  // Apply emitted steps
  const OnReceiveSteps = useDynamicCallback((data) => {
    if (!props.state.collab?.initialized) return

    const version = getCurrentVersion()
    if (version === undefined) return
    if (version > data.version) {
      // Set initialized to false and request server
      // state to recover from current out of sync state.
      dispatch(UpdateCollab({
        ...props.state.collab,
        initialized: false,
      }))

      props.state.collab.socket.emit('create', {room: props.state.collab.room})
      return
    }

    const tr = receiveTransaction(
      editorView.state,
      data.steps.map((item) => Step.fromJSON(editorView.state.schema, item.step)),
      data.steps.map((item) => item.clientID),
    )

    editorView.dispatch(tr)
  })

  const OnConnectError = useDynamicCallback(() => {
    dispatch(UpdateCollab({
      ...props.state.collab,
      started: false,
      error: true,
    }))
  })

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
    if (args.file === props.state.path) {
      await loadFile()
      return
    }

    dispatch(Open({
      path: args.file,
    }))
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
        dispatch(UpdateCollab({room, started: true}))
      }
    }
  }, [props.state.loading])

  // If collab is started
  useEffect(() => {
    if (props.state.collab?.started) {
      const socket = io(COLLAB_URL, {transports: ['websocket']})
      dispatch(UpdateCollab({...props.state.collab, socket}))
    } else if (props.state.collab) {
      window.history.replaceState(null, '', '/')
      props.state.collab?.socket?.close()

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
  }, [props.state.collab?.started])

  // Init collab if socket is defined
  useEffect(() => {
    if (!props.state.collab?.socket) return

    // Send create message to server with doc and room
    props.state.collab.socket.emit('create', {
      doc: editorView.state.toJSON().doc,
      room: props.state.collab.room,
    })

    props.state.collab.socket.on('update', OnReceiveUpdate)
    props.state.collab.socket.on('steps', OnReceiveSteps)
    props.state.collab.socket.on('connect_error', OnConnectError)
  }, [props.state.collab?.socket])

  // Listen to state changes and send them to all collab users
  useDebouncedEffect(() => {
    if (!props.state.text?.initialized || !props.state.collab?.initialized) return

    const sendable = getSendableSteps()
    if (!sendable) return

    props.state.collab.socket.emit('update', {
      room: props.state.collab.room,
      update: {
        version: sendable.version,
        steps: sendable.steps.map(step => step.toJSON()),
        clientID: props.state.collab.socket.id,
      },
    })
  }, 200, [props.state.text?.editorState])

  // Load file if path has changed
  useEffect(() => {
    if (props.state.path && props.state.loading === 'initialized') {
      loadFile()
    }
  }, [props.state.path])

  // Recreate prosemirror if config properties has changed
  // which need a full recreation of extensions.
  useEffect(() => {
    if (!props.state.text?.initialized) return
    const version = getCurrentVersion()
    const newText = createState({
      data: editorView.state.toJSON(),
      config: props.state.config,
      path: props.state.path,
      keymap,
      collab: props.state.collab ? {
        version,
        clientID: props.state.collab.socket.id,
      } : undefined
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
      !props.state.text.initialized ||
      !props.state.lastModified
    ) return

    const data: any = {
      lastModified: props.state.lastModified,
      files: props.state.files,
      config: props.state.config,
      path: props.state.path,
    }

    if (props.state.path) {
      let text = markdownSerializer.serialize(editorView.state.doc)
      if (text.charAt(text.length - 1) !== '\n') {
        text += '\n'
      }

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
    <Layout data-testid={props.state.loading}>
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
            text={props.state.text}
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
