import {styled} from 'solid-styled-components'

export const Layout = styled('div')`
  cursor: var(--cursor-default);
  touch-action: none;
  background: var(--background);
  display: flex;
  width: 100%;
  height: 100%;
  font-family: var(--font-family);
  color: var(--foreground);
  position: relative;
  overflow: hidden;
  .drop-cursor {
    background: var(--primary-background) !important;
    height: 5px !important;
    border-radius: var(--border-radius);
  }
  .block-tooltip,
  .table-menu-tooltip,
  .autocomplete-tooltip,
  .menu-tooltip,
  .canvas-link-end-tooltip {
    position: absolute;
    width: max-content;
    background: var(--tooltip-background);
    border-radius: var(--border-radius);
    font-family: var(--menu-font-family);
    font-size: var(--menu-font-size);
    line-height: 1.4;
    z-index: 200;
    box-shadow: 0 12px 24px 0 rgba(0, 0, 0, 0.24);
    padding: 6px 8px;
    div {
      position: relative;
      z-index: 1;
      display: block;
      padding: 6px 8px;
      margin: 2px 0;
      min-height: 32px;
      cursor: var(--cursor-pointer);
      border-radius: var(--border-radius);
      &:hover, &.selected {
        background: var(--primary-background);
        color: var(--primary-foreground);
      }
    }
    .divider {
      height: 3px;
      border: 0;
      border-radius: 5px;
      background: var(--foreground-10);
      margin: 5px 0;
    }
    .arrow {
      width: 6px;
      height: 6px;
      background: var(--tooltip-background);
      position: absolute;
      transform: rotate(45deg);
    }
  }
  .cm-tooltip-autocomplete {
    border-radius: var(--border-radius) !important;
    border: 0 !important;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
    font-family: var(--font-family-monospace);
    font-size: var(--font-size);
    line-height: 1.4;
    ul {
      max-height: 300px !important;
      li {
        padding: 10px !important;
      }
    }
  }
  .yjs-cursor {
    position: relative;
    margin-left: -1px;
    margin-right: -1px;
    border-left: 1px solid black;
    border-right: 1px solid black;
    border-color: var(--primary-background);
    word-break: normal;
    pointer-events: none;
  }
`

export const Scroll = styled('div')`
  display: flex;
  height: 100%;
  width: 100%;
  min-height: 100vh;
  max-height: 100vh;
  overflow-y: auto;
  justify-content: center;
  scrollbar-width: none;
  touch-action: none;
  &::-webkit-scrollbar {
    display: none;
  }
  @media print {
    overflow-y: visible;
  }
`

export const Content = styled('div')`
  position: relative;
  height: 100%;
  width: ${(props: any) => props.config.contentWidth}px;
  padding: 50px;
  padding-bottom: 77vh;
  overflow-y: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
  code {
    font-family: var(--font-family-monospace);
  }
`
