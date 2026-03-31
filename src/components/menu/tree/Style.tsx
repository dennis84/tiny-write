import {styled} from 'solid-styled-components'
import {ITEM_HEIGHT, itemCss} from '../Style'

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

interface ItemProps {
  deleted?: boolean
  selected?: boolean
  active?: boolean
}

// biome-ignore format: ternary breaks ugly
export const TreeGroup = styled.div<ItemProps>`
  ${(p) => p.selected ? `
    background: var(--primary-background-10);
    border-radius: var(--border-radius-small);
  ` : ''}
`

// biome-ignore format: ternary breaks ugly
export const TreeLinkItem = styled.div<ItemProps>`
  ${itemCss}
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  align-items: start;
  ${(p) => p.deleted ? `
    opacity: 0.3;
    pointer-events: none;
  ` : ''}
  ${(p) => p.active ? `
    font-weight: bold;
    font-family: var(--menu-font-family-bold);
    color: var(--primary-background);
  ` : ''}
  ${(p) => p.selected ? `
    background: var(--primary-background-10);
    border-radius: var(--border-radius-small);
  ` : ''}
  &:hover {
    color: var(--primary-background);
    background: var(--background-90);
    border-radius: var(--border-radius-small);
    > span {
      opacity: 1;
    }
  }
`

interface CornerProps {
  highlight?: boolean
  level?: number
  expandable?: boolean
}

// biome-ignore format: ternary breaks ugly
export const TreeLinkCorner = styled.i<CornerProps>`
  margin-right: 10px;
  cursor: var(--cursor-pointer);
  font-family: monospace;
  font-weight: normal;
  font-style: normal;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--background-50);
  height: ${ITEM_HEIGHT};
  ${(p) => (p.highlight ? `color: var(--primary-background);` : "")}
  ${(p) => (p.level ? `margin-left: ${String(20 * p.level)}px;` : "")}
  ${(p) => p.expandable ? `
    &:hover {
      background: var(--background-90);
      border-radius: var(--border-radius-small);
    }
  ` : ''}
`

interface TitleProps {
  highlight?: boolean
  grabbing?: boolean
}

export const TreeLinkTitle = styled.span<TitleProps>`
  cursor: var(--cursor-pointer);
  width: 100%;
  touch-action: none;
  word-break: break-all;
  ${(p) => (p.highlight ? `color: var(--primary-background-80);` : '')}
  ${(p) => (p.grabbing ? 'cursor: var(--cursor-grabbed);' : '')}
`

// biome-ignore format: ternary breaks ugly
export const LinkMenu = styled.span<{selected?: boolean}>`
  justify-self: flex-end;
  display: flex;
  align-items: center;
  justify-content: center;
  height: ${ITEM_HEIGHT};
  width: ${ITEM_HEIGHT};
  margin-left: auto;
  cursor: var(--cursor-pointer);
  opacity: 0;
  border-radius: var(--border-radius);
  color: var(--foreground);
  ${(p) => p.selected ? `
    opacity: 1;
    background: var(--background-90);
  ` : ''}
  &:hover {
    background: var(--background-90);
    .icon {
      font-weight: bold;
    }
  }
`
