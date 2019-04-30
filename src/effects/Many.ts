import {Dispatch, Effect} from 'hyperapp'

export default (args: Effect[], dispatch: Dispatch) => {
  args.forEach(effect => effect[0](effect[1], dispatch))
}
