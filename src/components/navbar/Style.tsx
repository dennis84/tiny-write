import {styled} from 'solid-styled-components'

interface ContainerProps {
  justify?: 'flex-end' | 'flex-start'
}

export const FloatingContainer = styled.div<ContainerProps>`
  width: 100%;
  position: absolute;
  top: 0;
  right: 0;
  z-index: var(--z-index-dialog);
  display: flex;
  justify-content: ${(p) => p.justify};
  align-items: center;
  padding: 5px;
  pointer-events: none;
  > * {
    pointer-events: auto;
  }
`
