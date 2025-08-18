import {createSignal} from 'solid-js'
import type {InputLineConfig} from '@/components/dialog/InputLine'

export class InputLineService {
  private inputLineSignal = createSignal<InputLineConfig>()

  get inputLine() {
    return this.inputLineSignal[0]
  }

  setInputLine(inputLine: InputLineConfig | undefined) {
    this.inputLineSignal[1](inputLine)
  }
}
