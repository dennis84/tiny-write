import {createResource, Show, Suspense} from 'solid-js'
import {createConfig} from '@/state'
import {pause} from '@/utils/promise'
import {AppService} from '@/services/AppService'
import {Main} from './Main'
import {Content, Layout, Scroll} from './Layout'

const Loading = () => {
  const [delay] = createResource(async () => {
    await pause(2000)
    return true
  })

  return (
    <Layout data-testid="loading">
      <Scroll data-tauri-drag-region="true">
        <Content config={createConfig()} data-tauri-drag-region="true">
          <Show when={delay()}>Loading ...</Show>
        </Content>
      </Scroll>
    </Layout>
  )
}

export const Init = () => {
  const [state] = createResource(async () => {
    return AppService.fetchData()
  })

  return (
    <Suspense fallback={<Loading />}>
      <Show when={state()}>{(s) => <Main state={s()} />}</Show>
    </Suspense>
  )
}
