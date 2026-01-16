import {
  Route,
  Router,
  type RouteSectionProps,
  useCurrentMatches,
  useLocation,
  useMatch,
} from '@solidjs/router'
import {createEffect, createMemo, ErrorBoundary, onMount, Show, untrack} from 'solid-js'
import {DarkMode} from '@/components/DarkMode'
import {DropFile} from '@/components/DropFile'
import {InputLine} from '@/components/dialog/InputLine'
import {Keymap} from '@/components/Keymap'
import {DragArea, Layout, PageContent} from '@/components/Layout'
import {MouseCursor} from '@/components/MouseCursor'
import {Menu} from '@/components/menu/Menu'
import {FloatingNavbar} from '@/components/menu/Navbar'
import {CanvasPage, NewCanvasPage} from '@/components/pages/CanvasPage'
import {ChatPage} from '@/components/pages/ChatPage'
import {CodePage, NewCodePage} from '@/components/pages/CodePage'
import {DirPage} from '@/components/pages/DirPage'
import {EditorPage, NewEditorPage} from '@/components/pages/EditorPage'
import {Redirect} from '@/components/pages/Redirect'
import {ResizeWindow} from '@/components/ResizeWindow'
import {Toast} from '@/components/Toast'
import {Variables} from '@/components/Variables'
import {DB} from '@/db'
import {isTauri} from '@/env'
import {setAlwaysOnTop} from '@/remote/app'
import {startLanguageServer} from '@/remote/copilot'
import {show, updateWindow} from '@/remote/window'
import {createCtrl} from '@/services'
import {StateContext} from '@/state'
import {type LocationState, Page, type State} from '@/types'
import {enumFromValue} from '@/utils/enum'
import {Dialog} from './dialog/Dialog'
import {GeneralError} from './Error'
import {Title} from './pages/Title'

type Ctrl = ReturnType<typeof createCtrl>

const isCtrl = (s: any): s is Ctrl => s.store !== undefined

export const Main = (props: {state: State | Ctrl}) => {
  const Root = (p: RouteSectionProps) => {
    let layoutRef!: HTMLDivElement
    const ctrl = isCtrl(props.state) ? props.state : createCtrl(props.state)

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

    // Make sure location state is synced to store on initial load and on changes.
    const locationGate = createMemo(async () => {
      const location = useLocation<LocationState>()
      const matchPage = useMatch(() => '/:page/*')
      const currentMatches = useCurrentMatches()

      // Listen on changes of location state.
      location.state?.merge
      location.state?.selection
      location.state?.share

      // Set URL params to state location on initail page load.
      const pageMatch = matchPage() // To parse the page type from /:page/*
      if (pageMatch) {
        const page = enumFromValue(Page, pageMatch.params.page)
        const mainMatch = currentMatches()[0] // Matches on /editor/:id, /code/:id, ...
        if (mainMatch) {
          const id = mainMatch.params.id
          await untrack(async () => {
            // Reset attachments when navigating to a new page.
            ctrl.threadService.setAttachments([])
            await ctrl.appService.setLocation({
              ...location.state,
              page,
              codeId: page === Page.Code ? id : undefined,
              editorId: page === Page.Editor ? id : undefined,
              canvasId: page === Page.Canvas ? id : undefined,
              threadId: page === Page.Assistant ? id : location.state?.threadId,
            })
          })
        }
      }

      return true
    })

    createEffect((prev) => {
      if (!prev) return ctrl.store.config.theme?.code
      untrack(() => {
        for (const f of ctrl.store.files) {
          if (!f.editorView && !f.codeEditorView) continue
          if (f.code) ctrl.codeService.updateConfig(f)
          else ctrl.editorService.updateEditorState(f)
        }
      })

      return ctrl.store.config.theme?.code
    })

    return (
      <StateContext.Provider value={ctrl}>
        <ErrorBoundary fallback={(error) => <GeneralError error={error} />}>
          <Layout ref={layoutRef} data-testid="initialized">
            <PageContent>
              <FloatingNavbar />
              <Show when={locationGate()}>{p.children}</Show>
            </PageContent>
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
            <Dialog />
            <Toast />
            <Title />
          </Layout>
        </ErrorBoundary>
      </StateContext.Provider>
    )
  }

  return (
    <Router root={Root}>
      <Route path="/editor" component={NewEditorPage} />
      <Route path="/editor/:id" component={EditorPage} />

      <Route path="/canvas" component={NewCanvasPage} />
      <Route path="/canvas/:id" component={CanvasPage} />

      <Route path="/code" component={NewCodePage} />
      <Route path="/code/:id" component={CodePage} />

      <Route path="/dir" component={DirPage} />

      <Route path="/assistant" component={ChatPage} />
      <Route path="/assistant/:id" component={ChatPage} />

      <Route path="*" component={Redirect} />
    </Router>
  )
}
