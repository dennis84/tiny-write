import {Extension} from '@codemirror/state'

import {materialLight} from '@ddietr/codemirror-themes/material-light'
import {materialDark} from '@ddietr/codemirror-themes/material-dark'
import {solarizedLight} from '@ddietr/codemirror-themes/solarized-light'
import {solarizedDark} from '@ddietr/codemirror-themes/solarized-dark'
import {dracula} from '@ddietr/codemirror-themes/dracula'
import {githubLight} from '@ddietr/codemirror-themes/github-light'
import {githubDark} from '@ddietr/codemirror-themes/github-dark'
import {aura} from '@ddietr/codemirror-themes/aura'

export const getTheme = (theme: string): Extension =>
  theme === 'dracula' ? dracula :
  theme === 'solarized-light' ? solarizedLight :
  theme === 'solarized-dark' ? solarizedDark :
  theme === 'material-light' ? materialLight :
  theme === 'material-dark' ? materialDark :
  theme === 'github-light' ? githubLight :
  theme === 'github-dark' ? githubDark :
  theme === 'aura' ? aura :
  materialLight
