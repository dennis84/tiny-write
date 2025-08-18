import type {Extension} from '@codemirror/state'
import {aura} from '@ddietr/codemirror-themes/aura'
import {dracula} from '@ddietr/codemirror-themes/dracula'
import {githubDark} from '@ddietr/codemirror-themes/github-dark'
import {githubLight} from '@ddietr/codemirror-themes/github-light'
import {materialDark} from '@ddietr/codemirror-themes/material-dark'
import {materialLight} from '@ddietr/codemirror-themes/material-light'
import {solarizedDark} from '@ddietr/codemirror-themes/solarized-dark'
import {solarizedLight} from '@ddietr/codemirror-themes/solarized-light'
import {tokyoNightDay} from '@ddietr/codemirror-themes/tokyo-night-day'
import {tokyoNightStorm} from '@ddietr/codemirror-themes/tokyo-night-storm'

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
