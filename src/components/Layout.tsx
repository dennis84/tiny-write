import {styled} from 'solid-styled-components'

export const Layout = styled('div')`
  touch-action: none;
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
  .block-tooltip,
  .table-menu-tooltip,
  .autocomplete-tooltip,
  .file-tooltip,
  .canvas-tooltip,
  .canvas-link-end-tooltip {
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

export const CardList = styled('nav')`
  margin: 10px 0;
  margin-bottom: 30px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-column-gap: 20px;
`

export const Card = styled('div')`
  margin-bottom: 20px;
  overflow: hidden;
`

export const CardContent = styled('div')`
  height: 180px;
  overflow: hidden;
  margin: 1px;
  padding: 4px;
  word-break: break-all;
  cursor: pointer;
  font-size: 10px;
  line-height: 1.2;
  color: var(--foreground);
  background: var(--foreground-5);
  border: 1px solid var(--foreground-50);
  ${(props: any) => props.active ? `
    border-color: var(--primary-background);
    box-shadow: 0 0 0 1px var(--primary-background);
  ` : ''}
  ${(props: any) => props.selected ? `
    border-color: var(--primary-background);
    box-shadow: 0 0 0 1px var(--primary-background);
    background: var(--foreground-10);
  ` : ''}
  border-radius: var(--border-radius);
  p {
    margin: 4px 0;
  }
  p:first-child {
    margin: 0;
  }
  h2 {
    margin: 0;
    font-size: 14px;
  }
  img {
    max-width: 50%;
    float: left;
    margin-right: 2px;
  }
  pre {
    border: 1px solid var(--foreground-50);
    background: var(--foreground-10);
    border-radius: var(--border-radius);
    padding: 0 4px;
    margin: 4px 0;
    overflow: hidden;
  }
  &:hover {
    border-color: var(--primary-background);
    box-shadow: 0 0 0 1px var(--primary-background);
    background: var(--foreground-10);
  }
`

export const CardFooter = styled('div')`
  font-size: 12px;
  margin-top: 5px;
  color: var(--foreground-60);
  display: flex;
  align-items: flex-start;
`

export const CardMenuButton = styled('button')`
  justify-self: flex-end;
  margin-left: auto;
  background: none;
  border: 0;
  color: var(--foreground-60);
  cursor: pointer;
  padding: 0;
  ${(props: any) => props.selected ? `
    color: var(--primary-background);
  ` : ''}
  &:hover {
    color: var(--primary-background);
  }
`
