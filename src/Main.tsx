import React, {useEffect, useReducer, useRef} from 'react'
import {selectAll, deleteSelection} from 'prosemirror-commands'
import {Step} from 'prosemirror-transform'
import {sendableSteps, getVersion, receiveTransaction} from 'prosemirror-collab'
import {EditorView} from 'prosemirror-view'
import {undo, redo} from 'prosemirror-history'
import {io} from 'socket.io-client'
import {Global, ThemeProvider} from '@emotion/react'
import styled from '@emotion/styled'
import {rgb} from './styles'
import {background, color, color2, font, fonts} from './config'
import {Args, State} from '.'
import * as remote from './remote'
import db from './db'
import {isElectron, mod, COLLAB_URL} from './env'
import {useDebouncedEffect, useDynamicCallback} from './hooks'
import {markdownSerializer} from './markdown'
import {
  UpdateState,
  UpdateError,
  UpdateText,
  UpdateCollab,
  UpdateLoading,
  New,
  Discard,
  ReducerContext,
  ToggleFullscreen,
  Open,
  reducer,
} from './reducer'
import {ErrorBoundary} from './ErrorBoundary'
import Editor from './components/Editor'
import ErrorView from './components/Error'
import Menu from './components/Menu'
import {isEmpty} from './prosemirror/prosemirror'
import {createParser} from './prosemirror/paste-markdown'
import {createState, createEmptyState} from './prosemirror'

const Container = styled.div`
  position: relative;
  display: flex;
  background: ${(props) => rgb(background(props.theme))};
  width: 100%;
  height: 100%;
  font-family: ${(props) => font(props.theme)};
  font-size: 18px;
  color: ${(props) => rgb(color(props.theme))};
  .drop-cursor {
    background: ${(props) => rgb(color2(props.theme))} !important;
    height: 2px !important;
    opacity: 0.5;
  }
`

const isText = (x: any) => x && x.doc && x.selection

const isState = (x: any) =>
  (typeof x.lastModified !== 'string') &&
  Array.isArray(x.files)

const isFile = (x: any): boolean => x.text || x.path

const isConfig = (x: any): boolean =>
  typeof x.theme === 'string' &&
  typeof x.codeTheme === 'string' &&
  typeof x.font === 'string'

export default (props: {state: State}) => {
  const [state, dispatch] = useReducer(reducer, props.state)
  const editorViewRef = useRef<EditorView>()

  const OnNew = useDynamicCallback(() => {
    dispatch(New)
    return true
  })

  const OnDiscard = useDynamicCallback((editorState, editorDispatch, editorView) => {
    if (state.path) {
      dispatch(Discard)
    } else if (state.files.length > 0 && isEmpty(state.text.editorState)) {
      dispatch(Discard)
    } else {
      selectAll(editorView.state, editorView.dispatch)
      deleteSelection(editorView.state, editorView.dispatch)
    }

    return true
  })

  const OnFullscreen = useDynamicCallback(() => {
    dispatch(ToggleFullscreen)
    return true
  })

  const OnUndo = useDynamicCallback(() => {
    if (!editorViewRef.current) return
    undo(editorViewRef.current.state, editorViewRef.current.dispatch)
    return true
  })

  const OnRedo = useDynamicCallback(() => {
    if (!editorViewRef.current) return
    redo(editorViewRef.current.state, editorViewRef.current.dispatch)
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
      return getVersion(editorViewRef.current.state)
    } catch(err) {
      return undefined
    }
  }

  const getSendableSteps = () => {
    try {
      return sendableSteps(editorViewRef.current.state)
    } catch(err) {
      return undefined
    }
  }

  const createTextByData = (data: any) => createState({
    data: data.created ? state.text.editorState.toJSON() : {
      selection: {type: 'text', anchor: 1, head: 1},
      doc: data.doc,
    },
    config: state.config,
    path: state.path,
    keymap,
    collab: {
      version: data.version,
      clientID: data.clientID,
    }
  })

  // Receive update response after create and recreate the state.
  const OnReceiveUpdate = useDynamicCallback((data: any) => {
    window.history.replaceState(null, '', `/${data.room}`)

    // Init room if message is from us and collab plugin is not initialized
    if (!state.collab.initialized && data.clientID === state.collab.socket.id) {
      // Recreate editorState with enabled collab plugin
      const newText = createTextByData(data)
      // Create new file if we're not the creator
      const backup = !data.created
      dispatch(UpdateCollab({
        ...state.collab,
        room: data.room,
        users: data.users,
        initialized: true,
      }, newText, backup))

      return
    }

    // Only update users
    dispatch(UpdateCollab({
      ...state.collab,
      users: data.users,
    }))
  })

  // Apply emitted steps
  const OnReceiveSteps = useDynamicCallback((data) => {
    if (!state.collab?.initialized) return

    const version = getCurrentVersion()
    if (version === undefined) return
    if (version > data.version) {
      // Set initialized to false and request server
      // state to recover from current out of sync state.
      dispatch(UpdateCollab({
        ...state.collab,
        initialized: false,
      }))

      state.collab.socket.emit('create', {room: state.collab.room})
      return
    }

    const tr = receiveTransaction(
      editorViewRef.current.state,
      data.steps.map((item) => Step.fromJSON(editorViewRef.current.state.schema, item.step)),
      data.steps.map((item) => item.clientID),
    )

    editorViewRef.current.dispatch(tr)
  })

  const OnConnectError = useDynamicCallback(() => {
    dispatch(UpdateCollab({
      ...state.collab,
      started: false,
      error: true,
    }))
  })

  const loadFile = async () => {
    const fileExists = await remote.fileExists(state.path)
    if (!fileExists) {
      dispatch(Discard)
      return
    }

    const decoder = new TextDecoder('utf-8')
    const data = await remote.readFile(state.path)
    const fileContent = decoder.decode(data.buffer)
    const parser = createParser(state.text.schema)
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
      config: state.config,
      path: state.path,
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
      dispatch(UpdateState({...state, loading: 'initialized'}))
      return
    }

    const config = {...state.config, ...parsed.config}
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
      ...state,
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

  const loadArgs = async (args: Args) => {
    if (args.file === state.path) {
      await loadFile()
      return
    }

    dispatch(Open({
      path: args.file,
    }))
  }

  // On mount, load state from DB.
  useEffect(() => {
    initialize()
  }, [])

  // After initialization is completed
  useEffect(() => {
    if (state.loading === 'roundtrip') {
      dispatch(UpdateLoading('initialized'))
    }

    if (state.loading === 'initialized') {
      if (state.args) {
        loadArgs(state.args)
      }

      remote.on('second-instance', (args) => {
        loadArgs(args)
      });

      const room = window.location.pathname?.slice(1)
      if (!isElectron && room) {
        dispatch(UpdateCollab({room, started: true}))
      }
    }
  }, [state.loading])

  // If collab is started
  useEffect(() => {
    if (state.collab?.started) {
      const socket = io(COLLAB_URL, {transports: ['websocket']})
      dispatch(UpdateCollab({...state.collab, socket}))
    } else if (state.collab) {
      window.history.replaceState(null, '', '/')
      state.collab?.socket?.close()

      // Recreate editorState without collab plugin.
      const newText = createState({
        data: state.text.editorState.toJSON(),
        config: state.config,
        path: state.path,
        keymap,
      })

      dispatch(UpdateCollab({
        started: false,
        error: state.collab.error,
      }, newText))
    }
  }, [state.collab?.started])

  // Init collab if socket is defined
  useEffect(() => {
    if (!state.collab?.socket) return

    // Send create message to server with doc and room
    state.collab.socket.emit('create', {
      doc: state.text.editorState.toJSON().doc,
      room: state.collab.room,
    })

    state.collab.socket.on('update', OnReceiveUpdate)
    state.collab.socket.on('steps', OnReceiveSteps)
    state.collab.socket.on('connect_error', OnConnectError)
  }, [state.collab?.socket])

  // Listen to state changes and send them to all collab users
  useDebouncedEffect(() => {
    if (!state.text?.initialized) return
    if (!state.collab?.initialized) return

    const sendable = getSendableSteps()
    if (!sendable) return

    state.collab.socket.emit('update', {
      room: state.collab.room,
      update: {
        version: sendable.version,
        steps: sendable.steps.map(step => step.toJSON()),
        clientID: state.collab.socket.id,
      },
    })
  }, 200, [state.text?.editorState])

  // Load file if path has changed
  useEffect(() => {
    if (state.path && state.loading === 'initialized') {
      loadFile()
    }
  }, [state.path])

  // Recreate prosemirror if config properties has changed
  // which need a full recreation of extensions.
  useEffect(() => {
    if (!state.text?.initialized) return
    const version = getCurrentVersion()
    const newText = createState({
      data: state.text.editorState.toJSON(),
      config: state.config,
      path: state.path,
      keymap,
      collab: state.collab ? {
        version,
        clientID: state.collab.socket.id,
      } : undefined
    })

    dispatch(UpdateText(newText))
  }, [
    state.config.codeTheme,
    state.config.fontSize,
    state.config.typewriterMode,
    state.config.dragHandle,
  ])

  // Toggle remote fullscreen if changed
  useEffect(() => {
    if (state.loading !== 'initialized') return
    remote.setFullscreen(state.fullscreen)
  }, [state.fullscreen])

  // Toggle remote alwaysOnTop if changed
  useEffect(() => {
    remote.setAlwaysOnTop(state.config.alwaysOnTop)
  }, [state.config.alwaysOnTop])

  // Save state in DB if lastModified has changed
  useDebouncedEffect(() => {
    if (state.loading !== 'initialized' || !state.lastModified) return
    const data: any = {
      lastModified: state.lastModified,
      files: state.files,
      config: state.config,
      path: state.path,
    }

    if (state.path) {
      if (state.text.editorState?.initialized) {
        let text = markdownSerializer.serialize(state.text.editorState.doc)
        if (text.charAt(text.length - 1) !== '\n') {
          text += '\n'
        }
        remote.writeFile(state.path, text)
      }
    } else {
      data.text = state.text?.editorState.toJSON()
    }

    db.set('state', JSON.stringify(data))
  }, 100, [state.lastModified])

  const fontsStyles = Object.entries(fonts)
    .filter(([, value]) => value.src)
    .map(([, value]) => ({
      '@font-face': {
        fontFamily: `'${value.label}'`,
        src: `url('${value.src}')`,
      },
    }))

  const editorState = state.text ?? createEmptyState({
    config: state.config,
    keymap,
  })

  return (
    <ReducerContext.Provider value={dispatch}>
      <ThemeProvider theme={state.config}>
        <Global styles={fontsStyles} />
        <ErrorBoundary fallback={(error) => <ErrorView error={error} />}>
          <Container data-testid={state.loading}>
            {state.error ? (
              <ErrorView error={state.error} />
            ) : (
              <>
                <Editor
                  editorViewRef={editorViewRef}
                  text={editorState}
                  lastModified={state.lastModified}
                  files={state.files}
                  config={state.config} />
                <Menu
                  editorViewRef={editorViewRef}
                  text={state.text}
                  lastModified={state.lastModified}
                  path={state.path}
                  files={state.files}
                  config={state.config}
                  fullscreen={state.fullscreen}
                  collab={state.collab} />
              </>
            )}
          </Container>
        </ErrorBoundary>
      </ThemeProvider>
    </ReducerContext.Provider>
  )
}
