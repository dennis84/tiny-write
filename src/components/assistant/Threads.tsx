import {formatDistance} from 'date-fns'
import {createSignal, For, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useConfirmDialog} from '@/hooks/use-confirm-dialog'
import {useDialog} from '@/hooks/use-dialog'
import {useInputLine} from '@/hooks/use-input-line'
import {useState} from '@/state'
import type {Thread} from '@/types'
import {Button, ButtonGroup} from '../Button'
import {DialogFooter, DialogLabel, DialogScroll} from '../dialog/Style'
import {TooltipHelp} from '../dialog/TooltipHelp'
import {IconAdd, IconDelete, IconEdit, IconHistory, IconPin, IconSearch, IconUnpin} from '../Icon'

const Scroll = styled(DialogScroll)`
  width: 600px;
  max-height: 80vh;
`

const ThreadItemButton = styled.span`
  justify-self: flex-end;
  margin-left: auto;
  margin-right: -4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-small);
  width: 30px;
  height: 30px;
  &:hover {
    background: var(--background-20);
  }
  .icon {
    margin: 0 !important;
  }
`

const ThreadItem = styled.div`
  display: flex;
  align-items: center;
  padding: 2px 6px;
  margin: 2px 0;
  height: 32px;
  cursor: var(--cursor-pointer);
  border-radius: var(--border-radius-small);
  .action {
    display: none;
    justify-self: flex-end;
    margin-left: auto;
  }
  &:hover,
  &.selected {
    background: var(--primary-background);
    color: var(--primary-foreground);
    .action {
      display: block;
    }
    .last-modified {
      display: none;
    }
  }
`

const ThreadTitle = styled.div`
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  width: calc(100% - 80px);
`

const LastModified = styled.div`
  justify-self: flex-end;
  margin-left: auto;
  color: var(--foreground-50);
  white-space: nowrap;
`

const SearchRow = styled.div``

const SearchBorder = styled.div`
  border: 2px solid var(--primary-background);
  color: var(--primary-background);
  background: var(--code-background);
  height: 40px;
  width: 100%;
  border-radius: 30px;
  position: relative;
  margin-bottom: 10px;
  .icon {
    position: absolute;
    right: 0;
    top: -2px;
    height: 40px;
    width: 40px;
    color: var(--primary-background);
  }
`

const SearchInput = styled.input`
  height: 40px;
  padding: 0 20px;
  line-height: 40px;
  padding-bottom: 2px;
  width: 100%;
  border-radius: 30px;
  font-size: var(--menu-font-size);
  outline: none;
  text-decoration: none;
  font-family: var(--menu-font-family);
  border: 0;
  background: none;
  color: var(--foreground);
`

interface Props {
  onChange: (thread: Thread) => void
}

export const Threads = (props: Props) => {
  const {threadService} = useState()
  const [searchTerm, setSearchTerm] = createSignal<string | undefined>(undefined)
  const showConfirmDialog = useConfirmDialog()
  const showInputLine = useInputLine()

  const onMenuClick = () => {
    showTooltip()
  }

  const onDeleteAll = async () => {
    showConfirmDialog({
      title: 'Delete all threads',
      content: 'Are you sure you want to delete all threads?',
      onConfirm: async () => {
        const newThread = await threadService.deleteAll()
        props.onChange(newThread)
      },
    })
  }

  const onSearchInput = (e: Event) => {
    setSearchTerm((e.target as HTMLInputElement).value)
  }

  const onNew = () => {
    const newThread = threadService.newThread()
    props.onChange(newThread)
    closeTooltip()
  }

  const onSelect = (thread: Thread) => {
    props.onChange(thread)
    closeTooltip()
  }

  const onDelete = (e: MouseEvent, thread: Thread) => {
    e.stopPropagation()
    showConfirmDialog({
      title: 'Delete thread',
      content: 'Are you sure you want to delete this thread?',
      onConfirm: async () => {
        await threadService.delete(thread)
      },
    })
  }

  const onRename = (e: MouseEvent, thread: Thread) => {
    e.stopPropagation()
    showInputLine({
      value: thread.title ?? '',
      onEnter: async (value: string) => {
        const title = value.trim() || undefined
        if (title) await threadService.updateTitle(thread.id, title)
      },
    })
  }

  const onPin = async (e: MouseEvent, thread: Thread) => {
    e.stopPropagation()
    await threadService.togglePin(thread.id)
  }

  const ThreadsDialog = () => {
    let searchInputRef!: HTMLInputElement

    onMount(() => {
      searchInputRef.focus()
    })

    return (
      <>
        <SearchRow>
          <SearchBorder>
            <SearchInput
              ref={searchInputRef}
              placeholder="Search"
              onInput={onSearchInput}
              value={searchTerm() || ''}
            />
            <IconSearch />
          </SearchBorder>
        </SearchRow>
        <Scroll>
          <For each={threadService.getThreads(searchTerm())}>
            {([thread, label]) => (
              <>
                <Show when={label}>
                  <DialogLabel>{label}</DialogLabel>
                </Show>
                <ThreadItem onClick={() => onSelect(thread)} data-testid="thread_item">
                  <ThreadTitle>{thread.title ?? 'Untitled'}</ThreadTitle>
                  <LastModified class="last-modified">
                    <Show when={thread.lastModified}>
                      {(lastMod) => <span>{formatDistance(lastMod(), new Date())}</span>}
                    </Show>
                  </LastModified>
                  <ButtonGroup class="action">
                    <TooltipHelp title="Delete thread">
                      <ThreadItemButton
                        onClick={(e) => onDelete(e, thread)}
                        data-testid="thread_item_delete"
                      >
                        <IconDelete />
                      </ThreadItemButton>
                    </TooltipHelp>
                    <TooltipHelp title="Rename thread">
                      <ThreadItemButton
                        onClick={(e) => onRename(e, thread)}
                        data-testid="thread_item_rename"
                      >
                        <IconEdit />
                      </ThreadItemButton>
                    </TooltipHelp>
                    <TooltipHelp title="Pin/Unpin thread">
                      <ThreadItemButton
                        onClick={(e) => onPin(e, thread)}
                        data-testid="thread_item_pin"
                      >
                        <Show when={thread.pinned} fallback={<IconPin />}>
                          <IconUnpin />
                        </Show>
                      </ThreadItemButton>
                    </TooltipHelp>
                  </ButtonGroup>
                </ThreadItem>
              </>
            )}
          </For>
        </Scroll>
        <DialogFooter>
          <ButtonGroup justify="flex-end">
            <Button onClick={onNew}>
              <IconAdd /> New
            </Button>
            <Button onClick={onDeleteAll}>
              <IconDelete /> Delete all
            </Button>
          </ButtonGroup>
        </DialogFooter>
      </>
    )
  }

  const [showTooltip, closeTooltip] = useDialog({
    component: ThreadsDialog,
  })

  return (
    <Button onClick={onMenuClick} data-testid="history">
      <IconHistory />
      History
    </Button>
  )
}
