import {onMount, Switch, Match, ErrorBoundary, createEffect, untrack, Show} from 'solid-js'
import {Route, Router, RouteSectionProps, useLocation} from '@solidjs/router'
import {LocationState, State, StateContext} from '@/state'
import {createCtrl} from '@/services'
import {info} from '@/remote/log'
import {isTauri} from '@/env'
import {locationToString} from '@/utils/debug'
import {DragArea, Layout, PageContent} from '@/components/Layout'
import {Menu} from '@/components/menu/Menu'
import {Error} from '@/components/Error'
import {Keymap} from '@/components/Keymap'
import {Variables} from '@/components/Variables'
import {MouseCursor} from '@/components/MouseCursor'
import {DropFile} from '@/components/DropFile'
import {ResizeWindow} from '@/components/ResizeWindow'
import {DarkMode} from '@/components/DarkMode'
import {Toast} from '@/components/Toast'
import {InputLine} from '@/components/dialog/InputLine'
import {EditorPage} from '@/components/pages/EditorPage'
import {CanvasPage} from '@/components/pages/CanvasPage'
import {CodePage} from '@/components/pages/CodePage'
import {DirPage} from '@/components/pages/DirPage'
import {Redirect} from '@/components/pages/Redirect'
import {ChatPage} from '@/components/pages/ChatPage'

export const Main = (props: {state: State}) => {
  const Root = (p: RouteSectionProps) => {
    let layoutRef!: HTMLDivElement
    const location = useLocation<LocationState>()
    const ctrl = createCtrl(props.state)

    info(`Open root (location=${locationToString(location)})`)

    const onViewError = (error: any, reset: any) => {
      ctrl.appService.setError({error})
      reset()
      return <></>
    }

    onMount(async () => {
      ctrl.appService.layoutRef = layoutRef
      try {
        await ctrl.appService.init()
      } catch (error: any) {
        ctrl.appService.setError({id: 'init_failed', error})
      }
    })

    createEffect((prev) => {
      if (!prev) return ctrl.store.config.codeTheme
      untrack(() => {
        for (const f of ctrl.store.files) {
          if (!f.editorView && !f.codeEditorView) continue
          if (f.code) ctrl.codeService.updateConfig(f)
          else ctrl.editorService.updateEditorState(f)
        }
      })

      return ctrl.store.config.codeTheme
    })

    return (
      <StateContext.Provider value={ctrl}>
        <ErrorBoundary fallback={onViewError}>
          <Layout ref={layoutRef} data-testid={ctrl.store.loading}>
            <Switch>
              <Match when={ctrl.store.error}>
                <Error />
              </Match>
              <Match when={ctrl.store.loading === 'initialized'}>
                <PageContent>{p.children}</PageContent>
              </Match>
            </Switch>
            <Show when={isTauri()}>
              <DragArea data-tauri-drag-region="true" />
            </Show>
            <MouseCursor />
            <Menu />
            <Keymap />
            <Variables />
            <DropFile />
            <ResizeWindow />
            <DarkMode />
            <InputLine />
            <Toast />
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
      <Route path="/dir" component={DirPage} />
      <Route path="/assistant" component={ChatPage} />
      <Route path="*" component={Redirect} />
    </Router>
  )
}
