import React, {useEffect, useReducer} from 'react'
import {Global} from '@emotion/core'
import styled from '@emotion/styled'
import {ThemeProvider} from 'emotion-theming'
import {rgb} from './styles'
import {background, font, fonts} from './config'
import {newState} from '.'
import db from './db'
import {updateRemote} from './remote'
import {UpdateState, Notify, ReducerContext, reducer} from './reducer'
import {usePrevious} from './use-previous'
import Editor from './components/Editor'
import StatusLine from './components/StatusLine'
import Notification from './components/Notification'
import {createState, createEmptyState} from './components/ProseMirror/state'

const Container = styled.div<any>`
  position: relative;
  display: block;
  background: ${props => rgb(background(props.theme))};
  width: 100%;
  height: 100%;
  font-family: ${props => font(props.theme)};
`

const isText = (x: any) => x && x.doc

const isState = (x: any) =>
  x.lastModified instanceof Date &&
  Array.isArray(x.files)

const isFile = (x: any): boolean =>
  x.text &&
  x.lastModified instanceof Date

const isConfig = (x: any): boolean =>
  typeof x.theme === 'string' &&
  typeof x.codeTheme === 'string' &&
  typeof x.font === 'string'

export default () => {
  const initialState = newState({
    text: createEmptyState(),
  });

  const [state, dispatch] = useReducer(reducer, initialState)
  const loadingPrev = usePrevious(state.loading)

  useEffect(() => {
    db.get('state').then((data) => {
      let parsed
      try {
        parsed = JSON.parse(data)
      } catch (err) {}

      if (!parsed) {
        dispatch(UpdateState({...state, loading: false}))
        return;
      }

      const config = {...state.config, ...parsed.config}
      if (!isConfig(config)) {
        dispatch(Notify({id: 'invalid_config', props: config}))
        return;
      }

      if (!isText(parsed.text)) {
        dispatch(Notify({id: 'invalid_file', props: parsed.text}))
        return;
      }

      let text
      try {
        text = createState(parsed.text)
      }  catch (err) {
        dispatch(Notify({id: 'invalid_file', props: parsed.text}))
        return;
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

      if (parsed.lastModified) newState.lastModified = new Date(parsed.lastModified)
      if (parsed.files) {
        for (const file of parsed.files) {
          file.text = createState(file.text)
          file.lastModified = new Date(file.lastModified)
          if (!isFile(file)) {
            dispatch(Notify({id: 'invalid_file', props: file}))
          }
        }
      }

      if (!isState(newState)) {
        dispatch(Notify({id: 'invalid_state', props: newState}))
        return;
      }

      dispatch(UpdateState(newState))
    })
  }, [])

  useEffect(() => {
    updateRemote(state, dispatch)
  }, [state]);

  useEffect(() => {
    if (loadingPrev !== false) {
      return
    }

    db.set('state', JSON.stringify(state))
  }, [state.lastModified])

  const fontsStyles = Object.entries(fonts)
    .filter(([, value]) => value.src)
    .map(([, value]) => ({
      '@font-face': {
        'fontFamily': `'${value.label}'`,
        'src': `url('${value.src}')`,
      }
    }))

  return (
    <ReducerContext.Provider value={dispatch}>
      <ThemeProvider theme={state.config}>
        <Global styles={fontsStyles} />
        <Container>
          <Editor
            text={state.text}
            lastModified={state.lastModified}
            files={state.files}
            config={state.config}
            loading={state.loading} />
          <StatusLine
            text={state.text}
            lastModified={state.lastModified} />
          {state.notification && (
            <Notification notification={state.notification} />
          )}
        </Container>
      </ThemeProvider>
    </ReducerContext.Provider>
  )
}
