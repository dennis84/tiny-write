import {For} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {Common, IconButton} from '../Button'
import {Icon} from '../Icon'

const ThreadList = styled('div')`
  position: relative;
  display: inline-flex;
  max-width: 220px;
  select {
    ${Common}
    padding-right: 40px;
    width: 100%;
    appearance: none;
    background: var(--background-60);
    color: var(--foreground);
    &:hover {
      color: var(--primary-background);
    }
  }
  button {
    pointer-events: none;
    position: absolute;
    right: 0;
    top: 0;
  }
`

interface Props {
  onChange: () => void
}

export const Threads = (props: Props) => {
  const {store, threadService} = useState()

  const onChange = async (e: Event) => {
    const target = e.target as HTMLSelectElement
    threadService.open(target.value)
    props.onChange()
  }

  return (
    <ThreadList>
      <select onChange={onChange}>
        <option value="">Select an old chat</option>
        <For each={store.threads.filter((t) => !t.active)}>
          {(t) => <option value={t.id}>{t.title}</option>}
        </For>
      </select>
      <IconButton>
        <Icon>keyboard_arrow_down</Icon>
      </IconButton>
    </ThreadList>
  )
}
