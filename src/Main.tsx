import React, {useEffect, useReducer} from 'react'
import {freestyle, rgb} from './styles'
import {background, font} from './config'
import {insertCss} from 'insert-css'
import {State, Config} from '.'
import {save, read} from './store'
import {updateMenu} from './menu'
import {UpdateState, ReducerContext, reducer} from './reducer'
import Editor from './components/Editor'
import StatusLine from './components/StatusLine'
import Notification from './components/Notification'

const container = (config: Config) => freestyle.registerStyle({
  'position': 'relative',
  'display': 'block',
  'background': rgb(background(config)),
  'width': '100%',
  'height': '100%',
  'font-family': font(config),
})

interface Props {
  initialState: State;
}

export default (props: Props) => {
  const [state, dispatch] = useReducer(reducer, props.initialState);

  useEffect(() => {
    dispatch(UpdateState(read()))
  }, [])

  useEffect(() => {
    save(state)
  }, [state])

  useEffect(() => {
    insertCss(freestyle.getStyles())
    updateMenu(state, dispatch)
  }, [state.config, state.files])

  useEffect(() => {
    insertCss(freestyle.getStyles())
  }, [state.config])

  return (
    <ReducerContext.Provider value={dispatch}>
      <div className={container(state.config)}>
        <Editor
          text={state.text}
          files={state.files}
          config={state.config}
          lastModified={state.lastModified} />
        <StatusLine
          text={state.text}
          lastModified={state.lastModified}
          config={state.config} />
        {state.notification ? <Notification notification={state.notification} /> : ''}
      </div>
    </ReducerContext.Provider>
  )
}
