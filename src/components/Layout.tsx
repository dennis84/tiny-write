import {styled} from 'solid-styled-components'

export const Layout = styled('div')`
  background: var(--background);
  display: flex;
  width: 100%;
  height: 100%;
  font-family: var(--font-family);
  color: var(--foreground);
  position: relative;
  .drop-cursor {
    background: var(--primary-background) !important;
    height: 5px !important;
    border-radius: 5px;
  }
  .mouse-cursor-container {
    position: fixed;
    overflow: hidden;
    width: 100vw;
    height: 100vw;
    user-select: none;
    pointer-events: none;
    .mouse-cursor {
      position: absolute;
      height: 10px;
      margin-left: -15px;
      z-index: 20;
      pointer-events: none;
      user-select: none;
      span {
        position: absolute;
        display: inline-flex;
        align-items: center;
        height: 20px;
        top: 20px;
        right: 0;
        line-height: 0;
        white-space: nowrap;
        padding: 4px;
        font-family: var(--menu-font-family);
        font-size: var(--menu-font-size);
        border-radius: var(--border-radius);
      }
      &::before, &::after {
        content: '';
        transform: rotate(148deg);
        position: absolute;
        width: 10px;
        height: 0;
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
        border-bottom: 10px solid var(--user-background);
      }
      &::before {
        transform: rotate(148deg);
        left: 0
      }
      &::after {
        transform: rotate(-77deg);
        left: -1px;
        top: -1px;
      }
    }
  }
  .block-tooltip,
  .table-menu-tooltip,
  .autocomplete-tooltip,
  .file-tooltip {
    position: absolute;
    width: max-content;
    background: var(--tooltip-background);
    border-radius: var(--border-radius);
    font-family: var(--menu-font-family);
    font-size: var(--menu-font-size);
    line-height: 1.4;
    z-index: 200;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    div {
      position: relative;
      z-index: 1;
      display: block;
      padding: 10px;
      cursor: pointer;
      &:hover, &.selected {
        background: var(--selection);
      }
    }
    .divider {
      height: 1px;
      border: 0;
      background: var(--foreground-20);
      margin: 0;
    }
    .arrow {
      width: 8px;
      height: 8px;
      background: var(--tooltip-background);
      position: absolute;
      transform: rotate(45deg);
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
