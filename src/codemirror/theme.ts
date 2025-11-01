import type {Extension} from '@codemirror/state'
import {aura, config as auraConfig} from '@ddietr/codemirror-themes/aura'
import {dracula, config as draculaConfig} from '@ddietr/codemirror-themes/dracula'
import {githubDark, config as githubDarkConfig} from '@ddietr/codemirror-themes/github-dark'
import {githubLight, config as githubLightConfig} from '@ddietr/codemirror-themes/github-light'
import {materialDark, config as materialDarkConfig} from '@ddietr/codemirror-themes/material-dark'
import {
  materialLight,
  config as materialLightConfig,
} from '@ddietr/codemirror-themes/material-light'
import {
  solarizedDark,
  config as solarizedDarkConfig,
} from '@ddietr/codemirror-themes/solarized-dark'
import {
  solarizedLight,
  config as solarizedLightConfig,
} from '@ddietr/codemirror-themes/solarized-light'
import {
  tokyoNightDay,
  config as tokyoNightDayConfig,
} from '@ddietr/codemirror-themes/tokyo-night-day'
import {
  tokyoNightStorm,
  config as tokyoNightStormConfig,
} from '@ddietr/codemirror-themes/tokyo-night-storm'

export const getThemeConfig = (theme: string) =>
  theme === 'dracula'
    ? draculaConfig
    : theme === 'solarized-light'
      ? solarizedLightConfig
      : theme === 'solarized-dark'
        ? solarizedDarkConfig
        : theme === 'material-light'
          ? materialLightConfig
          : theme === 'material-dark'
            ? materialDarkConfig
            : theme === 'github-light'
              ? githubLightConfig
              : theme === 'github-dark'
                ? githubDarkConfig
                : theme === 'aura'
                  ? auraConfig
                  : theme === 'tokyo-night'
                    ? tokyoNightStormConfig
                    : theme === 'tokyo-night-day'
                      ? tokyoNightDayConfig
                      : materialLightConfig

export const getTheme = (theme: string): Extension =>
  theme === 'dracula'
    ? dracula
    : theme === 'solarized-light'
      ? solarizedLight
      : theme === 'solarized-dark'
        ? solarizedDark
        : theme === 'material-light'
          ? materialLight
          : theme === 'material-dark'
            ? materialDark
            : theme === 'github-light'
              ? githubLight
              : theme === 'github-dark'
                ? githubDark
                : theme === 'aura'
                  ? aura
                  : theme === 'tokyo-night'
                    ? tokyoNightStorm
                    : theme === 'tokyo-night-day'
                      ? tokyoNightDay
                      : materialLight
