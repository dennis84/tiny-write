import {styled} from 'solid-styled-components'
import {type ButtonAttrs, IconButton} from '@/components/Button'
import {itemCss} from '../Style'

export const HighlightContent = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  border: 10px solid var(--primary-background-50);
  user-select: none;
  pointer-events: none;
`

export const GhostContainer = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
`

export const Ghost = styled.div`
  position: absolute;
  display: none;
  color: var(--foreground);
  font-size: var(--menu-font-size);
  font-family: var(--menu-font-family);
  width: 400px;
  overflow: hidden;
`

export const DropLine = styled.div<{level: number}>`
  position: absolute;
  height: 4px;
  border-radius: 4px;
  width: 100%;
  background: var(--primary-background-50);
  pointer-events: none;
  z-index: 1;
  margin-left: ${(p) => 20 * p.level}px;
`

// biome-ignore format: ternary breaks ugly
export const TreeNode = styled.div<{selected?: boolean}>`
  display: grid;
  gap: 2px;
  ${(p) => p.selected ? `
    background: var(--primary-background-10);
    border-radius: var(--border-radius-small);
  ` : ''}
`

// biome-ignore format: ternary breaks ugly
export const TreeLinkMenu = styled<ButtonAttrs & {selected?: boolean}>(IconButton)`
  flex-shrink: 0;
  justify-self: flex-end;
  margin-left: auto;
  opacity: 0;
`

interface ItemProps {
  deleted?: boolean
  selected?: boolean
  active?: boolean
  isOnCanvas?: boolean
}

// biome-ignore format: ternary breaks ugly
export const TreeLinkItem = styled.div<ItemProps>`
  ${itemCss}
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  align-items: center;
  border-radius: var(--border-radius-small);
  .icon {
    color: var(--background-20);
  }
  &:hover {
    &, .icon {
      color: var(--primary-background);
    }
    background: var(--background-90);
    button {
      opacity: 1;
      color: var(--primary-background);
    }
  }
  ${(p) => p.deleted ? `
    opacity: 0.3;
    pointer-events: none;
  ` : ''}
  ${(p) => p.selected ? `
    background: var(--background-90);
    button {
      opacity: 1;
    }
  ` : ''}
  ${(p) => p.isOnCanvas ? `
    font-weight: bold;
    font-family: var(--menu-font-family-bold);
    &, .icon, button {
      color: var(--primary-background);
    }
  ` : ''}
  ${(p) => p.active ? `
    font-weight: bold;
    font-family: var(--menu-font-family-bold);
    background: var(--primary-background-10);
    &, .icon, button {
      color: var(--primary-background);
    }
    &:hover {
      background: var(--primary-background-10);
    }
  ` : ''}
`

export const TreeLinkTitle = styled.span<{grabbing?: boolean}>`
  cursor: var(--cursor-pointer);
  display: flex;
  align-items: center;
  width: 100%;
  touch-action: none;
  white-space: nowrap;
  gap: 5px;
  ${(p) => (p.grabbing ? 'cursor: var(--cursor-grabbed);' : '')}
`
