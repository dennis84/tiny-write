import {h} from 'hyperapp'
import {freestyle} from '../styles'
import {Config} from '..'
import LastModified from './LastModified'
import WordCount from './WordCount'

const text = (config: Config) => freestyle.registerStyle({
  'height': '50px',
  'width': '100%',
  'display': 'grid',
  'grid-template-columns': '1fr 1fr 1fr',
  'justify-items': 'center',
  'align-items': 'center',
  'position': 'absolute',
  'bottom': '0',
  'padding': '0 20px',
})

interface Props {
  text: string,
  lastModified: Date,
  config: Config,
}

export default (props: Props) => (
  <div class={text(props.config)}>
    <WordCount text={props.text} config={props.config} />
    <LastModified lastModified={props.lastModified} config={props.config} />
  </div>
)
