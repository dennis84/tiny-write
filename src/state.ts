import {createContext, useContext} from 'solid-js'
import * as v from 'valibot'
import type {Ctrl} from './services'
import {
  type Canvas,
  type CanvasBoxElement,
  type CanvasCodeElement,
  type CanvasEditorElement,
  type CanvasElement,
  type CanvasImageElement,
  type CanvasLinkElement,
  type CanvasVideoElement,
  type Config,
  ConfigSchema,
  type Directory,
  ElementType,
  type File,
  type Filename,
  type MenuItem,
  type Project,
  type State,
  type Thread,
} from './types'

export const isBoxElement = (el?: CanvasElement): el is CanvasBoxElement =>
  el?.type === ElementType.Editor ||
  el?.type === ElementType.Code ||
  el?.type === ElementType.Image ||
  el?.type === ElementType.Video

export const isEditorElement = (el?: CanvasElement): el is CanvasEditorElement =>
  el?.type === ElementType.Editor

export const isCodeElement = (el?: CanvasElement): el is CanvasCodeElement =>
  el?.type === ElementType.Code

export const isLinkElement = (el?: CanvasElement): el is CanvasLinkElement =>
  el?.type === ElementType.Link

export const isImageElement = (el?: CanvasElement): el is CanvasImageElement =>
  el?.type === ElementType.Image

export const isVideoElement = (el?: CanvasElement): el is CanvasVideoElement =>
  el?.type === ElementType.Video

export const isFile = (it: any): it is File => it?.type === 'file'

export const isProject = (it: any): it is Project => it?.type === 'project'

export const isFilename = (it: any): it is Filename => it?.type === 'filename'

export const isDirectory = (it: any): it is Directory => it?.type === 'directory'

export const isLocalFile = (it: any): boolean => isFile(it) && it.path !== undefined

export const isCanvas = (it: any): it is Canvas => it?.type === 'canvas'

export const isThread = (it: any): it is Thread => Array.isArray(it?.messages)

export const isProjectItem = (it: any): boolean =>
  it?.type === 'filename' ||
  it?.type === 'directory' ||
  (it?.type === 'file' && it.projectId) ||
  (it?.type === 'project' && it.worktreePath !== undefined)

export const isDeletable = (it?: MenuItem): it is File | Canvas | Project =>
  (isFile(it) && !isLocalFile(it)) || isCanvas(it) || isThread(it)

export const isDirty = (file?: File) => {
  if (!file?.lastModified) return false
  const isDirty = isLocalFile(file) && (!file.lastSaved || file.lastModified > file.lastSaved)
  return isDirty
}

export const StateContext = createContext<Ctrl>({} as Ctrl)

export const useState = () => useContext(StateContext)

export const createConfig = (config: Partial<Config> = {}): Config => ({
  ...v.getFallbacks(ConfigSchema),
  ...config,
})

export const createState = (props: Partial<State> = {}): State => ({
  fullscreen: false,
  config: createConfig(),
  ...props,
})
