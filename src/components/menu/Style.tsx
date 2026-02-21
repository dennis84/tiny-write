import {css, styled} from 'solid-styled-components'
import {FULL_WIDTH} from '../Layout'

export const Container = styled('div')`
  display: flex;
  flex-shrink: 1;
  flex-grow: 1;
  height: 100%;
  max-width: 100%;
  font-family: var(--menu-font-family);
  background: var(--background);
  @media print {
    display: none;
  }
  @media (max-width: ${FULL_WIDTH.toString()}px) {
    max-width: 100vw;
  }
`

export const Label = styled('h3')`
  margin: 10px 0;
  font-size: var(--menu-font-size);
  text-transform: uppercase;
  color: var(--background-50);
  > i {
    text-transform: none;
  }
`

export const Sub = styled('nav')`
  margin: 10px 0;
  margin-bottom: 30px;
  position: relative;
`

export const ITEM_HEIGHT = 'calc(var(--menu-font-size) * 2)'

export const itemCss = `
  width: 100%;
  padding: 3px;
  margin: 0;
  outline: none;
  display: flex;
  align-items: center;
  color: var(--foreground);
  font-size: var(--menu-font-size);
  line-height: ${ITEM_HEIGHT};
  font-family: var(--menu-font-family);
  text-align: left;
  > .icon {
    margin: 0 10px;
  }
  > .icon:first-child {
    margin-left: 0;
  }
`

export const Text = styled('p')`
  ${itemCss}
`

export const Note = styled('p')`
  ${itemCss}
  color: var(--background-20);
  background: var(--background-90);
  border-radius: var(--border-radius);
  padding: 10px;
  margin: 10px 0;
`

export const Keys = (props: {keys: string[]}) => (
  <span
    class={
      'keys ' +
      css`
        margin-top: -4px;
        > i {
          color: var(--foreground);
          background: var(--background-90);
          border: 1px solid var(--background-40);
          box-shadow: 0 2px 0 0 var(--background-40);
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
