import React, {useEffect, useReducer, useRef} from 'react'
import {selectAll, deleteSelection} from 'prosemirror-commands'
import {EditorView} from 'prosemirror-view'
import {undo, redo} from 'prosemirror-history'
import {Global, ThemeProvider} from '@emotion/react'
import styled from '@emotion/styled'
import {rgb} from './styles'
import {background, color, font, fonts} from './config'
import {State} from '.'
import * as remote from './remote'
import db from './db'
import {mod} from './env'
import {useDebouncedEffect, usePrevious, useDynamicCallback} from './hooks'
import {
  UpdateState,
  UpdateError,
  UpdateText,
  New,
  Discard,
  ReducerContext,
  ToggleFullscreen,
  reducer,
} from './reducer'
import {ErrorBoundary} from './ErrorBoundary'
import Editor from './components/Editor'
import Error from './components/Error'
import Menu from './components/Menu'
import {isEmpty} from './prosemirror/prosemirror'
import {createState, createEmptyState} from './prosemirror-util'

const Container = styled.div`
  position: relative;
  display: flex;
  background: ${(props) => rgb(background(props.theme))};
  width: 100%;
  height: 100%;
  font-family: ${(props) => font(props.theme)};
  font-size: 18px;
  color: ${(props) => rgb(color(props.theme))};
`

const isText = (x: any) => x && x.doc

const isState = (x: any) =>
  x.lastModified instanceof Date &&
  Array.isArray(x.files)

const isFile = (x: any): boolean => x.text && x.lastModified

const isConfig = (x: any): boolean =>
  typeof x.theme === 'string' &&
  typeof x.codeTheme === 'string' &&
  typeof x.font === 'string'

export default (props: {state: State}) => {
  const [state, dispatch] = useReducer(reducer, props.state)
  const loadingPrev = usePrevious(state.loading)
  const editorViewRef = useRef<EditorView>()

  const OnNew = useDynamicCallback(() => {
    dispatch(New)
    return true
  })

  const OnDiscard = useDynamicCallback((editorState, editorDispatch, editorView) => {
    if (state.files.length > 0 && isEmpty(state.text.editorState)) {
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

  useEffect(() => {
    db.get('state').then((data) => {
      let parsed
      try {
        parsed = JSON.parse(data)
      } catch (err) { /* ignore */ }

      if (!parsed) {
        dispatch(UpdateState({...state, loading: false}))
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
        loading: false,
      }

      if (parsed.lastModified) {
        newState.lastModified = new Date(parsed.lastModified)
      }

      if (parsed.lastModified) {
        newState.lastModified = new Date(parsed.lastModified)
      }

      if (parsed.files) {
        for (const file of parsed.files) {
          if (!isFile(file)) {
            dispatch(UpdateError({id: 'invalid_file', props: file}))
          }
        }
      }

      if (!isState(newState)) {
        dispatch(UpdateError({id: 'invalid_state', props: newState}))
        return
      }

      dispatch(UpdateState(newState))
    })
  }, [])

  useEffect(() => {
    if (loadingPrev !== false) return
    remote.setFullScreen(state.fullscreen)
  }, [state.fullscreen]);

  useEffect(() => {
    if (!state.text?.initialized) return
    const newText = createState({
      data: state.text.editorState.toJSON(),
      config: state.config,
      keymap,
    })

    dispatch(UpdateText(newText))
  }, [state.config.codeTheme, state.config.fontSize, state.config.typewriterMode])

  useEffect(() => {
    remote.setAlwaysOnTop(state.config.alwaysOnTop);
  }, [state.config.alwaysOnTop])

  useDebouncedEffect(() => {
    if (loadingPrev !== false) {
      return
    }

    const data = {...state, text: state.text.editorState}
    delete data.fullscreen
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
        <ErrorBoundary fallback={(error) => <Error error={error} />}>
          <Container>
            {state.error ? (
              <Error error={state.error} />
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
                  files={state.files}
                  config={state.config}
                  fullscreen={state.fullscreen} />
              </>
            )}
          </Container>
        </ErrorBoundary>
      </ThemeProvider>
    </ReducerContext.Provider>
  )
}
