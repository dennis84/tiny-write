import {onMount, Switch, Match, ErrorBoundary, createEffect, untrack, Show} from 'solid-js'
import {
  Route,
  Router,
  type RouteSectionProps,
  useCurrentMatches,
  useLocation,
  useMatch,
} from '@solidjs/router'
import {type LocationState, Page, type State, StateContext} from '@/state'
import {createCtrl} from '@/services'
import {info} from '@/remote/log'
import {show, updateWindow} from '@/remote/window'
import {setAlwaysOnTop} from '@/remote/app'
import {startLanguageServer} from '@/remote/copilot'
import {DB} from '@/db'
import {isTauri} from '@/env'
import {locationToString} from '@/utils/debug'
import {enumFromValue} from '@/utils/enum'
import {DragArea, Layout, PageContent} from '@/components/Layout'
import {Menu} from '@/components/menu/Menu'
import {FloatingNavbar} from '@/components/menu/Navbar'
import {ErrorScreen} from '@/components/Error'
import {Keymap} from '@/components/Keymap'
import {Variables} from '@/components/Variables'
import {MouseCursor} from '@/components/MouseCursor'
import {ResizeWindow} from '@/components/ResizeWindow'
import {DarkMode} from '@/components/DarkMode'
import {Toast} from '@/components/Toast'
import {InputLine} from '@/components/dialog/InputLine'
import {DropFile} from '@/components/DropFile'
import {EditorPage} from '@/components/pages/EditorPage'
import {CanvasPage} from '@/components/pages/CanvasPage'
import {CodePage} from '@/components/pages/CodePage'
import {DirPage} from '@/components/pages/DirPage'
import {Redirect} from '@/components/pages/Redirect'
import {ChatPage} from '@/components/pages/ChatPage'

export const Main = (props: {state: State}) => {
  const Root = (p: RouteSectionProps) => {
    let layoutRef!: HTMLDivElement
    const ctrl = createCtrl(props.state)
    const location = useLocation<LocationState>()
    const matchPage = useMatch(() => '/:page/*')
    const currentMatches = useCurrentMatches()

    info(`Open root (location=${locationToString(location)})`)

    const onViewError = (error: any, reset: any) => {
      ctrl.appService.setError({error})
      reset()
      return <></>
    }

    onMount(async () => {
      ctrl.appService.layoutRef = layoutRef

      if (isTauri() && ctrl.store.window) {
        await updateWindow(ctrl.store.window)
      }

      if (isTauri() && ctrl.store.config?.alwaysOnTop) {
        await setAlwaysOnTop(true)
      }

      if (isTauri() && ctrl.store.ai?.copilot?.user) {
        // takes about 1.5s
        void startLanguageServer()
      }

      // cleanup deleted items
      await DB.cleanup()

      if (isTauri()) {
        await show()
      }
    })

    createEffect(async () => {
      const pageMatch = matchPage()
      if (pageMatch) {
        const page = enumFromValue(Page, pageMatch.params.page)
        const mainMatch = currentMatches()[0]
        if (mainMatch) {
          const id = mainMatch.params.id
          await ctrl.appService.setLastLocation({
            path: location.pathname,
            fileId: page === Page.Code || page === Page.Editor ? id : undefined,
            threadId: page === Page.Assistant ? id : undefined,
            canvasId: page === Page.Canvas ? id : undefined,
            page,
          })
        }
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
          <Layout ref={layoutRef} data-testid="initialized">
            <Switch>
              <Match when={ctrl.store.error}>
                <ErrorScreen />
              </Match>
              <Match when={true}>
                <PageContent>
                  <FloatingNavbar />
                  {p.children}
                </PageContent>
              </Match>
            </Switch>
            <Show when={isTauri()}>
              <DragArea data-tauri-drag-region="true" />
            </Show>
            <MouseCursor />
            <Menu />
            <DropFile />
            <Keymap />
            <Variables />
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
      <Route path="/assistant/:id" component={ChatPage} />
      <Route path="*" component={Redirect} />
    </Router>
  )
}
