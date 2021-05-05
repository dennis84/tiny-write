import {Rgb} from './config'

export const rgba = ([r, g, b]: Rgb, a = 1) => `rgba(${r}, ${g}, ${b}, ${a})`
