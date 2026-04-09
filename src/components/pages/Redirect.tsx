import {useLocation, useNavigate} from '@solidjs/router'
import {createRenderEffect, on} from 'solid-js'
import {basename} from '@/remote/editor'
import {info} from '@/remote/log'
import {useState} from '@/state'
import type {LocationState} from '@/types'

export const Redirect = () => {
  const {store, fileService, projectService, locationService} = useState()
  const location = useLocation<LocationState>()
  const navigate = useNavigate()

  createRenderEffect(
    on(
      () => ({
        filesState: fileService.resourceState,
        projectsState: projectService.resourceState,
      }),
      async ({filesState, projectsState}) => {
        if (filesState !== 'ready' || projectsState !== 'ready') return
        const lastLocation = store.lastLocation
        const path = store.args?.file
        const newFile = store.args?.newFile
        const argPath = newFile ?? path
        const selection = location.state?.selection

        if (store.args?.source && !argPath) {
          info(`Create project for dir`)
          const name = await basename(store.args.source)
          const project = await projectService.newProject({
            name,
            worktreePath: store.args.source,
          })

          locationService.openItem(project)
          return
        }

        if (argPath) {
          info(`Redirect to new file by path (path=${path}, newFile=${newFile})`)
          const file = await fileService.newFileByPath({path, newFile})
          return locationService.openItem(file, {selection})
        }

        if (lastLocation?.pathname) {
          info(`Redirect to last location (lastLocation=${JSON.stringify(lastLocation)})`)
          return navigate(lastLocation.pathname)
        }

        const file = await fileService.newFile()
        info(`Redirect to new empty file (id=${file.id})`)
        locationService.openItem(file, {selection})
      },
      {defer: false},
    ),
  )

  return null
}
