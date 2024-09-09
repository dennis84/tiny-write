import {onMount, Switch, Match, ErrorBoundary} from 'solid-js'
import {Route, Router, RouteSectionProps} from '@solidjs/router'
import {State, StateContext} from '@/state'
import {createCtrl} from '@/services'
import * as remote from '@/remote'
import {Layout} from '@/components/Layout'
import {Menu} from '@/components/menu/Menu'
import {Error} from '@/components/Error'
import {Keymap} from '@/components/Keymap'
import {Variables} from '@/components/Variables'
import {MouseCursor} from '@/components/MouseCursor'
import {DropFile} from '@/components/DropFile'
import {ResizeWindow} from '@/components/ResizeWindow'
import {DarkMode} from '@/components/DarkMode'
import {InputLine} from '@/components/dialog/InputLine'
import {EditorPage} from '@/components/pages/EditorPage'
import {CanvasPage} from '@/components/pages/CanvasPage'
import {CodePage} from '@/components/pages/CodePage'
import {Redirect} from '@/components/pages/Redirect'
import {Dir} from '@/components/pages/Dir'

export const Main = (props: {state: State}) => {
  const Root = (p: RouteSectionProps) => {
    remote.info(
      `Open route (path=${p.location.pathname}, search=${JSON.stringify(p.location.query)})`,
    )

    const ctrl = createCtrl(props.state)
    const [inputLine, setInputLine] = ctrl.appService.inputLine
    let layoutRef!: HTMLDivElement

    const onViewError = (error: any, reset: any) => {
      ctrl.appService.setError({error})
      reset()
      return <></>
    }

    onMount(async () => {
      ctrl.appService.layoutRef = layoutRef
      await ctrl.appService.init()
    })

    return (
      <StateContext.Provider value={ctrl}>
        <ErrorBoundary fallback={onViewError}>
          <Layout ref={layoutRef} data-testid={ctrl.store.loading}>
            <Switch>
              <Match when={ctrl.store.error}>
                <Error />
              </Match>
              <Match when={ctrl.store.args?.dir?.length && ctrl.store.loading === 'initialized'}>
                <Dir />
              </Match>
              <Match when={ctrl.store.loading === 'initialized'}>{p.children}</Match>
            </Switch>
            <MouseCursor />
            <Menu />
            <Keymap />
            <Variables />
            <DropFile />
            <ResizeWindow />
            <DarkMode />
            <InputLine getter={inputLine} setter={setInputLine} />
          </Layout>
        </ErrorBoundary>
      </StateContext.Provider>
    )
  }

  return (
    <Router root={Root}>
      <Route path="/editor/:id" component={EditorPage} />
      <Route path="/canvas/:id" component={CanvasPage} />
      <Route path="/code/:id" component={CodePage} />
      <Route path="*" component={Redirect} />
    </Router>
  )
}
