import {styled} from 'solid-styled-components'
import {isMac, isTauri} from '@/env'

interface ContainerProps {
  justify?: 'flex-end' | 'flex-start'
}

// Leave room for the macOS traffic light window buttons which overlay the
// top-left corner in Tauri (titleBarStyle: "Overlay" + hiddenTitle).
const isMacTauri = isTauri() && isMac

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
  ${(p) => (isMacTauri && p.justify !== 'flex-end' ? 'padding-left: 90px;' : '')}
  pointer-events: none;
  > * {
    pointer-events: auto;
  }
`
