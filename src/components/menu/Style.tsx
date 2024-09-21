import {css, styled} from 'solid-styled-components'
import {isTauri} from '@/env'

export const fullWidth = 500

export const Container = styled('div')`
  position: relative;
  flex-shrink: 0;
  flex-grow: 1;
  height: 100%;
  font-family: var(--menu-font-family);
  background: var(--background);
  @media print {
    display: none;
  }
`

// prettier-ignore
export const Burger = styled('button')`
  position: absolute;
  left: -52px;
  top: 2px;
  z-index: var(--z-index-max);
  background: none;
  border-radius: 50px;
  width: 50px;
  height: 50px;
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: var(--cursor-pointer);
  border: 0;
  outline: none;
  > span {
    background: var(--foreground);
    height: 3px;
    width: 15px;
    border-radius: 4px;
    transition: 0.4s;
    margin: 2px 0;
  }
  &:hover {
    background: var(--foreground-10);
  }
  ${(props: any) => props.active ? `
    right: 2px;
    left: auto;
    > span:nth-of-type(1) {
      transform: rotate(-45deg) translate(-2.5px, 2.5px);
    }
    > span:nth-of-type(2) {
      transform: rotate(45deg) translate(-2.5px, -2.5px);
    }
  ` : ''}
`

export const Drawer = styled('div')`
  background: var(--foreground-10);
  padding: 20px;
  height: 100%;
  display: ${(props: any) => (props.hidden ? 'none' : 'block')};
  width: 400px;
  overflow-y: auto;
  scrollbar-width: none;
  @media (max-width: ${fullWidth.toString()}px) {
    width: 100vw;
    ${isTauri() ? 'padding-top: 40px' : ''}
  }
  &::-webkit-scrollbar {
    display: none;
  }
`

export const Label = styled('h3')`
  margin: 10px 0;
  font-size: var(--menu-font-size);
  text-transform: uppercase;
  color: var(--foreground-50);
  > i {
    text-transform: none;
  }
`

export const Sub = styled('nav')`
  margin: 10px 0;
  margin-bottom: 30px;
  position: relative;
`

export const itemCss = `
  width: 100%;
  padding: 5px;
  margin: 0;
  outline: none;
  display: flex;
  align-items: center;
  color: var(--foreground);
  font-size: var(--menu-font-size);
  line-height: calc(var(--menu-font-size) * 1.6);
  font-family: var(--menu-font-family);
  text-align: left;
  > .icon {
    margin-right: 6px;
  }
`

export const Text = styled('p')`
  ${itemCss}
`

export const Note = styled('p')`
  ${itemCss}
  font-style: italic;
  color: var(--foreground-80);
  background: var(--foreground-5);
  border-radius: var(--border-radius);
  padding: 10px;
  margin-bottom: 20px;
`

// prettier-ignore
export const Link = styled('button')`
  ${itemCss}
  background: none;
  border: 0;
  cursor: var(--cursor-pointer);
  i {
    font-style: normal;
  }
  > .keys {
    justify-self: flex-end;
    margin-left: auto;
  }
  &:hover {
    color: var(--primary-background);
    background: var(--foreground-10);
    border-radius: var(--border-radius);
    > span i {
      position: relative;
      box-shadow: 0 3px 0 0 var(--foreground-60);
      top: -1px;
    }
  }
  &:active {
    > span i {
      position: relative;
      box-shadow: none;
      top: 1px;
    }
  }
  &[disabled] {
    color: var(--foreground-60);
    cursor: not-allowed;
  }
  ${(props: any) => props.active ? `
    background: var(--primary-background-20);
    border-radius: var(--border-radius);
  ` : ''}
`

export const Keys = (props: {keys: string[]}) => (
  <span
    class={
      'keys ' +
      css`
        margin-top: -4px;
        > i {
          color: var(--foreground);
          background: var(--foreground-10);
          border: 1px solid var(--foreground-60);
          box-shadow: 0 2px 0 0 var(--foreground-60);
          border-radius: 2px;
          font-style: normal;
          font-size: 13px;
          line-height: 1.4;
          padding: 1px 4px;
          margin: 0 1px;
        }
      `
    }
  >
    {props.keys.map((k: string) => (
      <i>{k}</i>
    ))}
  </span>
)
