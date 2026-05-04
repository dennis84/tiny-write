import type {DirEntry} from '@/remote/editor'
import {
  type Canvas,
  type CanvasEditorElement,
  type CanvasImageElement,
  type CanvasLinkElement,
  type Directory,
  EdgeType,
  ElementType,
  type File,
  type Filename,
  type Project,
  type Thread,
} from '@/types'
import * as pmUtil from './prosemirror-util'

export const lastModified = new Date()

export const createFile = (props: Partial<File>): File => ({
  type: 'file',
  id: props.id ?? '',
  ydoc: pmUtil.createYUpdate(props.id ?? '', []),
  versions: [],
  lastModified,
  ...props,
})

export const createCanvas = (props: Partial<Canvas> = {}): Canvas => ({
  type: 'canvas',
  id: 'c1',
  camera: {point: [0, 0], zoom: 1},
  elements: [],
  lastModified,
  ...props,
})

export const createEditorElement = (
  props: Partial<CanvasEditorElement> = {},
): CanvasEditorElement => ({
  id: '1',
  type: ElementType.Editor,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  ...props,
})

export const createLinkElement = (props: Partial<CanvasLinkElement> = {}): CanvasLinkElement => ({
  id: '1',
  type: ElementType.Link,
  from: '1',
  fromEdge: EdgeType.Left,
  to: '2',
  toEdge: EdgeType.Right,
  ...props,
})

export const createImageElement = (
  props: Partial<CanvasImageElement> = {},
): CanvasImageElement => ({
  id: '1',
  type: ElementType.Image,
  src: '/path/1.png',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  ...props,
})

export const createProject = (props: Partial<Project> = {}): Project => ({
  type: 'project',
  id: 'project_1',
  name: 'Project 1',
  worktreePath: '/users/me/project_1',
  ...props,
})

const project1 = createProject()

export const createDirEntry = (props: Partial<DirEntry> = {}): DirEntry => ({
  path: `${project1.worktreePath}/${props.name ?? 'code1.yaml'}`,
  relativePath: `~/project_1/${props.name ?? 'code1.yaml'}`,
  name: props.name?.split('/').findLast((x) => x) ?? 'code1.yaml',
  isDirectory: props.isDirectory ?? false,
  isFile: props.isFile ?? true,
  isSymlink: props.isSymlink ?? false,
})

const dirEntry1 = createDirEntry()

export const createFilename = (props: Partial<Filename> = {}): Filename => ({
  type: 'filename',
  id: dirEntry1.name,
  projectId: project1.id,
  parentId: project1.id,
  name: dirEntry1.name,
  path: dirEntry1.path,
  ...props,
})

export const createDirectory = (props: Partial<Directory> = {}): Directory => ({
  type: 'directory',
  id: dirEntry1.name,
  projectId: project1.id,
  parentId: project1.id,
  name: dirEntry1.name,
  path: dirEntry1.path,
  ...props,
})

export const createThread = (props: Partial<Thread> = {}): Thread => ({
  type: 'thread',
  id: '1',
  title: 'Thread 1',
  lastModified,
  messages: [],
  ...props,
})
