import {createContext, useContext} from 'solid-js'
import * as v from 'valibot'
import type {Ctrl} from './services'
import {FileService} from './services/FileService'
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
  ElementType,
  type File,
  type State,
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

export const isFile = (it: any): it is File => it?.ydoc !== undefined

export const isLocalFile = (it: any): boolean =>
  isFile(it) && (it.path !== undefined || it.newFile !== undefined)

export const isCodeFile = (it: any): it is File => {
  if (!it) return false
  if (it.code) return true
  const codeLang = FileService.getCodeLang(it)
  return codeLang !== undefined && codeLang !== 'markdown'
}

export const isCanvas = (it: any): it is Canvas => it?.camera

export const StateContext = createContext<Ctrl>({} as Ctrl)

export const useState = () => useContext(StateContext)

export const createConfig = (config: Partial<Config> = {}): Config => ({
  ...v.getFallbacks(ConfigSchema),
  ...config,
})

export const createState = (props: Partial<State> = {}): State => ({
  files: [],
  canvases: [],
  fullscreen: false,
  threads: [],
  config: createConfig(),
  ...props,
})
