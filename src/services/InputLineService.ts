import {InputLineConfig} from '@/components/dialog/InputLine'
import {createSignal} from 'solid-js'

export class InputLineService {
  private inputLineSignal = createSignal<InputLineConfig>()

  get inputLine() {
    return this.inputLineSignal[0]
  }

  setInputLine(inputLine: InputLineConfig | undefined) {
    this.inputLineSignal[1](inputLine)
  }
}
