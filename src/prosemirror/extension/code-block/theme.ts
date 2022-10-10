import {Extension} from '@codemirror/state'

import {materialLight} from '@ddietr/codemirror-themes/theme/material-light'
import {materialDark} from '@ddietr/codemirror-themes/theme/material-dark'
import {solarizedLight} from '@ddietr/codemirror-themes/theme/solarized-light'
import {solarizedDark} from '@ddietr/codemirror-themes/theme/solarized-dark'
import {dracula} from '@ddietr/codemirror-themes/theme/dracula'
import {githubLight} from '@ddietr/codemirror-themes/theme/github-light'
import {githubDark} from '@ddietr/codemirror-themes/theme/github-dark'
import {aura} from '@ddietr/codemirror-themes/theme/aura'

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
