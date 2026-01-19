import {createSignal, For, onMount, Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import type {DialogConfig} from '@/services/DialogService'
import {useState} from '@/state'
import type {Thread} from '@/types'
import {Button, ButtonGroup} from '../Button'
import {IconAdd, IconDelete, IconEdit, IconHistory, IconSearch} from '../Icon'

const SearchRow = styled('div')``

const TooltipFooter = styled('div')`
  margin-top: 10px;
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

const Scroller = styled('div')`
  width: 80vw;
  max-height: 80vh;
  overflow-y: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`

const Content = styled('div')`
  heigth: 100%;
`

export const Label = styled('div')`
  padding: 2px 6px;
  font-size: var(--menu-font-size);
  text-transform: uppercase;
  color: var(--foreground-50);
  font-weight: bold;
`

const ThreadItem = styled('div')`
  display: flex;
  align-items: center;
  padding: 2px 6px;
  margin: 2px 0;
  height: 40px;
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
  }
`

const SearchBorder = styled('div')`
  border: 2px solid var(--primary-background);
  color: var(--primary-background);
  height: 40px;
  width: 100%;
  border-radius: 30px;
  background: var(--background-60);
  position: relative;
  margin-bottom: 10px;
  .icon {
    position: absolute;
    right: 0;
    top: -2px;
    height: 40px;
    width: 40px;
    color: var(--foreground-50);
  }
`

const SearchInput = styled('input')`
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
  onChange: (id: string) => void
}

export const Threads = (props: Props) => {
  const {inputLineService, dialogService, threadService} = useState()
  const [searchTerm, setSearchTerm] = createSignal<string | undefined>(undefined)

  const onMenuClick = () => {
    dialogService.open({component: DialogContent})
  }

  const onDeleteAll = async () => {
    dialogService.open({
      title: 'Delete all threads',
      text: 'Are you sure you want to delete all threads?',
      onConfirm: async () => {
        const newThread = await threadService.deleteAll()
        props.onChange(newThread.id)
      },
    })
  }

  const onSearchInput = (e: Event) => {
    setSearchTerm((e.target as HTMLInputElement).value)
  }

  const DialogContent = (p: {dialog: DialogConfig}) => {
    let searchInputRef!: HTMLInputElement

    const onNew = () => {
      const newThread = threadService.newThread()
      props.onChange(newThread.id)
      dialogService.close(p.dialog)
    }

    const onSelect = (thread: Thread) => {
      props.onChange(thread.id)
      dialogService.close(p.dialog)
    }

    const onDelete = (thread: Thread) => {
      dialogService.open({
        title: 'Delete thread',
        text: 'Are you sure you want to delete this thread?',
        onConfirm: async () => {
          await threadService.delete(thread)
        },
      })
    }

    const onRename = (thread: Thread) => {
      inputLineService.setInputLine({
        value: thread.title ?? '',
        onEnter: async (value: string) => {
          const title = value.trim() || undefined
          if (title) await threadService.updateTitle(title, thread)
        },
      })
    }

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
        <Scroller>
          <Content>
            <For each={threadService.getThreads(searchTerm())}>
              {([thread, label]) => (
                <>
                  <Show when={label}>
                    <Label>{label}</Label>
                  </Show>
                  <ThreadItem onClick={() => onSelect(thread)}>
                    {thread.title ?? 'Untitled'}
                    <ButtonGroup class="action">
                      <TooltipButtonMenu
                        onClick={() => onDelete(thread)}
                        data-testid="thread_item_menu"
                      >
                        <IconDelete />
                      </TooltipButtonMenu>
                      <TooltipButtonMenu
                        onClick={() => onRename(thread)}
                        data-testid="thread_item_menu"
                      >
                        <IconEdit />
                      </TooltipButtonMenu>
                    </ButtonGroup>
                  </ThreadItem>
                </>
              )}
            </For>
          </Content>
        </Scroller>
        <TooltipFooter>
          <ButtonGroup>
            <Button onClick={onNew}>
              <IconAdd /> New
            </Button>
            <Button onClick={onDeleteAll}>
              <IconDelete /> Delete all
            </Button>
          </ButtonGroup>
        </TooltipFooter>
      </>
    )
  }

  return (
    <Button onClick={onMenuClick} data-testid="history">
      <IconHistory />
      History
    </Button>
  )
}
