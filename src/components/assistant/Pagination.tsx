import {Show} from 'solid-js'
import {styled} from 'solid-styled-components'
import {useState} from '@/state'
import {IconButton} from '../Button'
import {IconChevronLeft, IconChevronRight} from '../Icon'
import {itemCss} from '../menu/Style'

const PaginationContainer = styled('div')`
  display: inline-flex;
  align-items: center;
`

const CurrentPage = styled('div')`
  ${itemCss}
  width: auto;
`

interface Props {
  id: string
  parentId: string | undefined
  childrenIds: string[]
}

export const Pagination = (props: Props) => {
  const {threadService} = useState()

  const currentPage = () => {
    const childrenIds = props.childrenIds
    const total = childrenIds.length
    const current = childrenIds.indexOf(props.id)
    return `${current + 1}/${total}`
  }

  const onPrev = () => {
    const childrenIds = props.childrenIds
    const current = childrenIds.indexOf(props.id)
    const prev = childrenIds[current - 1]
    if (prev) threadService.updatePath(props.parentId, prev)
  }

  const onNext = () => {
    const childrenIds = props.childrenIds
    const current = childrenIds.indexOf(props.id)
    const next = childrenIds[current + 1]
    if (next) threadService.updatePath(props.parentId, next)
  }

  return (
    <Show when={props.childrenIds.length > 1}>
      <PaginationContainer>
        <IconButton onClick={onPrev}>
          <IconChevronLeft />
        </IconButton>
        <CurrentPage>{currentPage()}</CurrentPage>
        <IconButton onClick={onNext}>
          <IconChevronRight />
        </IconButton>
      </PaginationContainer>
    </Show>
  )
}
