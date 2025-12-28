import {createEffect, createSignal, For, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import type {Thread} from '@/types'
import {Button, ButtonGroup} from '../Button'
import {IconAdd, IconDelete, IconEdit, IconHistory, IconMoreHoriz, IconSearch} from '../Icon'
import {Label} from '../menu/Style'
import {Tooltip, TooltipButton} from '../Tooltip'

const TooltipFooter = styled('div')`
  margin-top: 10px;
`

const Scroller = styled('div')`
  max-width: 500px; /* Max width for the tooplip */
  height: 100%;
  overflow-y: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`

const TooltipButtonMenu = styled('span')`
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

const Content = styled('div')`
  heigth: 100%;
`

const SearchInput = styled('input')`
  height: 40px;
  padding: 0 20px;
  border-radius: 30px;
  font-size: var(--menu-font-size);
  outline: none;
  text-decoration: none;
  font-family: var(--menu-font-family);
  border: 0;
  background: var(--background-60);
  color: var(--foreground);
`

interface Props {
  onChange: (id: string) => void
}

export const Threads = (props: Props) => {
  let searchInputRef: HTMLInputElement | undefined
  const {inputLineService, threadService} = useState()
  const [menuTooltipAnchor, setMenuTooltipAnchor] = createSignal<HTMLElement>()
  const [submenuTooltipAnchor, setSubmenuTooltipAnchor] = createSignal<HTMLElement>()
  const [selectedThread, setSelectedThread] = createSignal<Thread>()
  const [searchMode, setSearchMode] = createSignal<boolean>(false)
  const [searchTerm, setSearchTerm] = createSignal<string | undefined>(undefined)

  const closeMenu = () => {
    setMenuTooltipAnchor(undefined)
    setSubmenuTooltipAnchor(undefined)
  }

  const onSelect = (id: string) => {
    setSubmenuTooltipAnchor(undefined)
    props.onChange(id)
  }

  const onMenuClick = (e: MouseEvent) => {
    setMenuTooltipAnchor(e.currentTarget as HTMLElement)
  }

  const onMenuClose = () => closeMenu()

  const onSubmenuClick = (e: MouseEvent, thread: Thread) => {
    e.stopPropagation()
    const target = e.currentTarget as HTMLElement
    const close = submenuTooltipAnchor() === target
    setSubmenuTooltipAnchor(undefined)
    setSubmenuTooltipAnchor(close ? undefined : target)
    setSelectedThread(thread)
  }

  const onNew = () => {
    const newThread = threadService.newThread()
    setSubmenuTooltipAnchor(undefined)
    props.onChange(newThread.id)
  }

  const onDeleteAll = async () => {
    const newThread = await threadService.deleteAll()
    setSubmenuTooltipAnchor(undefined)
    props.onChange(newThread.id)
  }

  const onSearchMode = async () => {
    setSearchMode(!searchMode())
  }

  const onSearchInput = (e: Event) => {
    setSearchTerm((e.target as HTMLInputElement).value)
  }

  const onSearchKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      setSearchMode(false)
    }
  }

  const onSearchBlur = () => {
    setSearchMode(false)
  }

  const onDelete = () => {
    const thread = selectedThread()
    if (!thread) return
    threadService.delete(thread)
    setSelectedThread(undefined)
    setSubmenuTooltipAnchor(undefined)
  }

  const onRename = () => {
    const thread = selectedThread()
    if (!thread) return
    setSubmenuTooltipAnchor(undefined)
    inputLineService.setInputLine({
      value: thread.title ?? '',
      onEnter: async (value: string) => {
        const title = value.trim() || undefined
        if (title) await threadService.updateTitle(title, thread)
      },
    })
  }

  createEffect(() => {
    if (searchMode()) {
      searchInputRef?.focus()
    }
  })

  return (
    <>
      <Button onClick={onMenuClick} data-testid="history">
        <IconHistory />
        History
      </Button>
      <Show when={menuTooltipAnchor()}>
        {(a) => (
          <Tooltip anchor={a()} onClose={onMenuClose} backdrop={true} placement="left">
            <Scroller>
              <Content>
                <For each={threadService.getThreads(searchTerm())}>
                  {([thread, label]) => (
                    <>
                      <Show when={label}>
                        <Label>{label}</Label>
                      </Show>
                      <TooltipButton
                        onClick={() => onSelect(thread.id)}
                        class={thread.id === threadService.currentThread?.id ? 'selected' : ''}
                        data-testid="thread_item"
                      >
                        {thread.title ?? 'Untitled'}
                        <TooltipButtonMenu
                          onClick={(e) => onSubmenuClick(e, thread)}
                          data-testid="thread_item_menu"
                        >
                          <IconMoreHoriz />
                        </TooltipButtonMenu>
                      </TooltipButton>
                    </>
                  )}
                </For>
              </Content>
            </Scroller>
            <TooltipFooter>
              <Show when={searchMode()}>
                <SearchInput
                  ref={searchInputRef}
                  placeholder="Search"
                  onInput={onSearchInput}
                  onKeyDown={onSearchKeyDown}
                  onBlur={onSearchBlur}
                  value={searchTerm() || ''}
                />
              </Show>
              <Show when={!searchMode()}>
                <ButtonGroup>
                  <Button onClick={onNew}>
                    <IconAdd /> New
                  </Button>
                  <Button onClick={onDeleteAll}>
                    <IconDelete /> Delete all
                  </Button>
                  <Button onClick={onSearchMode}>
                    <IconSearch /> Search
                  </Button>
                </ButtonGroup>
              </Show>
            </TooltipFooter>
            <Show when={submenuTooltipAnchor()}>
              {(subA) => (
                <Tooltip anchor={subA()} closeable={false} placement="right" offset={20}>
                  <TooltipButton onClick={onRename} data-testid="thread_item_menu_rename">
                    <IconEdit />
                    Rename
                  </TooltipButton>
                  <TooltipButton onClick={onDelete} data-testid="thread_item_menu_delete">
                    <IconDelete />
                    Delete
                  </TooltipButton>
                </Tooltip>
              )}
            </Show>
          </Tooltip>
        )}
      </Show>
    </>
  )
}
