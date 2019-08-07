declare module 'hyperapp' {
  export interface VNode {
  }

  export type View<S> = (state: S) => VNode

  export type Dispatch = (action: any, props: any) => void
  export type EffectFn = (dispatch: Dispatch, args: any) => void
  export type Effect = [EffectFn, any]

  interface Props<S> {
    init: S|[S,Effect],
    view: View<S>,
    node: HTMLElement,
    subscriptions?: (s: S) => Effect[],
  }

  export function app<S>(props: Props<S>): void
  export function h(tag: string, props: any, children: VNode[]): void
}
