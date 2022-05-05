import {Extension} from '@codemirror/state'

import {materialLight, config as materialLightConfig} from '@ddietr/codemirror-themes/theme/material-light'
import {materialDark, config as materialDarkConfig} from '@ddietr/codemirror-themes/theme/material-dark'
import {solarizedLight, config as solarizedLightConfig} from '@ddietr/codemirror-themes/theme/solarized-light'
import {solarizedDark, config as solarizedDarkConfig} from '@ddietr/codemirror-themes/theme/solarized-dark'
import {dracula, config as draculaConfig} from '@ddietr/codemirror-themes/theme/dracula'
import {githubLight, config as githubLightConfig} from '@ddietr/codemirror-themes/theme/github-light'
import {githubDark, config as githubDarkConfig} from '@ddietr/codemirror-themes/theme/github-dark'
import {aura, config as auraConfig} from '@ddietr/codemirror-themes/theme/aura'

export const getTheme = (theme: string): [Extension, any] =>
  theme === 'dracula' ? [dracula, draculaConfig] :
  theme === 'solarized-light' ? [solarizedLight, solarizedLightConfig] :
  theme === 'solarized-dark' ? [solarizedDark, solarizedDarkConfig] :
  theme === 'material-light' ? [materialLight, materialLightConfig] :
  theme === 'material-dark' ? [materialDark, materialDarkConfig] :
  theme === 'github-light' ? [githubLight, githubLightConfig] :
  theme === 'github-dark' ? [githubDark, githubDarkConfig] :
  theme === 'aura' ? [aura, auraConfig] :
  [materialLight, materialLightConfig]
