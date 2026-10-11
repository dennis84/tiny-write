import {Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {isTauri} from '@/env'
import {useTitle} from '@/hooks/use-title'
import {copy} from '@/remote/clipboard'
import {toAbsolutePath} from '@/remote/editor'
import {info} from '@/remote/log'
import type {FileBlock} from '@/services/AiService'
import {useState} from '@/state'
import {IconButton} from '../Button'
import {TooltipHelp} from '../dialog/TooltipHelp'
import {IconAdd, IconCopy, IconMerge} from '../icons/Ui'

const CodeBlockHeaderEl = styled.div`
  padding: 5px;
  padding-left: 20px;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) min-content min-content;
  align-items: center;
  font-size: 12px;
  font-family: var(--font-family-monospace);
`

export interface CodeBlockHeaderProps {
  block: FileBlock
}

export const CodeBlockHeader = (p: CodeBlockHeaderProps) => {
  const {store, fileService, projectService, projectFileService, threadService, locationService} =
    useState()

  const file = p.block.ref ? fileService.findFileById(p.block.ref) : undefined
  const title = useTitle({
    item: file,
    fallback: true,
    useCurrent: false,
  })

  const onCopy = () => copy(p.block.content ?? '')

  const onApply = () => {
    info(`Apply to file (id=${file?.id})`)

    if (!file) return

    const currentThread = threadService.currentThread
    if (!currentThread) return

    const doc = p.block.content ?? ''
    const range: [number, number] | undefined = p.block.range
      ? [p.block.range?.[0] ?? 0, p.block.range?.[1] ?? 0]
      : undefined
    locationService.openItem(file, {merge: {doc, range}, threadId: currentThread.id})
  }

  const onCreateFile = async () => {
    const fileSuggestion = p.block.path
    if (!fileSuggestion) return

    const project = projectService.currentProject
    let newFile = fileSuggestion

    if (isTauri()) {
      const basePath = project?.worktreePath ?? store.args?.cwd
      newFile = await toAbsolutePath(fileSuggestion, basePath)
    }

    const currentThread = threadService.currentThread
    const parentId = currentThread?.id

    const file = await projectFileService.newFileByPath({
      newFile,
      projectId: project?.id,
      parentId,
      insert: p.block.content,
      codeLang: p.block.lang,
    })

    locationService.openItem(file)
  }

  return (
    <CodeBlockHeaderEl data-testid="code_block_header">
      <span>{title() ?? p.block.path ?? p.block.lang ?? 'text'}</span>
      <TooltipHelp title="Copy">
        <IconButton onClick={onCopy} data-testid="panel_button_copy">
          <IconCopy />
        </IconButton>
      </TooltipHelp>
      <Show when={!file && p.block.path}>
        <TooltipHelp title="Create file">
          <IconButton onClick={onCreateFile} data-testid="panel_button_create">
            <IconAdd />
          </IconButton>
        </TooltipHelp>
      </Show>
      <Show when={file}>
        <TooltipHelp title="Apply in editor">
          <IconButton onClick={onApply} data-testid="panel_button_apply">
            <IconMerge />
          </IconButton>
        </TooltipHelp>
      </Show>
    </CodeBlockHeaderEl>
  )
}
