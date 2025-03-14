import {Dynamic} from 'solid-js/web'
import {JSX} from 'solid-js'
import {styled} from 'solid-styled-components'

import OcticonCopilot16 from '~icons/octicon/copilot-16?width=16px&height=16px'
import OcticonCopilotError16 from '~icons/octicon/copilot-error-16?width=16px&height=16px'
import MingcuteAiLine from '~icons/mingcute/ai-line?width=24px&height=24px'

import SimpleIconsPrettier from '~icons/simple-icons/prettier?width=24px&height=24px'
import MaterialSymbolsMoreVert from '~icons/material-symbols/more-vert?width=24px&height=24px'
import MaterialSymbolsMoreHoriz from '~icons/material-symbols/more-horiz?width=24px&height=24px'
import MaterialSymbolsClose from '~icons/material-symbols/close?width=24px&height=24px'
import MaterialSymbolsArrowBack from '~icons/material-symbols/arrow-back?width=24px&height=24px'
import MaterialSymbolsContrast from '~icons/material-symbols/contrast?width=24px&height=24px'
import MaterialSymbolsHistory from '~icons/material-symbols/history?width=24px&height=24px'
import MaterialSymbolsFullscreen from '~icons/material-symbols/fullscreen?width=24px&height=24px'
import MaterialSymbolsVerticalAlignCenter from '~icons/material-symbols/vertical-align-center?width=24px&height=24px'
import MaterialSymbolsSpellcheck from '~icons/material-symbols/spellcheck?width=24px&height=24px'
import MaterialSymbolsDesktopLandscape from '~icons/material-symbols/desktop-landscape?width=24px&height=24px'
import MaterialSymbolsLanguage from '~icons/material-symbols/language?width=24px&height=24px'
import MaterialSymbolsSaveAs from '~icons/material-symbols/save-as?width=24px&height=24px'
import MaterialSymbolsGesture from '~icons/material-symbols/gesture?width=24px&height=24px'
import MaterialSymbolsTextSnippet from '~icons/material-symbols/text-snippet?width=24px&height=24px'
import MaterialSymbolsAdd from '~icons/material-symbols/add?width=24px&height=24px'
import MaterialSymbolsDelete from '~icons/material-symbols/delete?width=24px&height=24px'
import MaterialSymbolsDeleteForever from '~icons/material-symbols/delete-forever?width=24px&height=24px'
import MaterialSymbolsCenterFocusWeakOutline from '~icons/material-symbols/center-focus-weak-outline?width=24px&height=24px'
import MaterialSymbolsPostAdd from '~icons/material-symbols/post-add?width=24px&height=24px'
import MaterialSymbolsEdit from '~icons/material-symbols/edit?width=24px&height=24px'
import MaterialSymbolsEditSquareOutline from '~icons/material-symbols/edit-square-outline'
import MaterialSymbolsCodeBlocks from '~icons/material-symbols/code-blocks?width=24px&height=24px'
import MaterialSymbolsContentCopy from '~icons/material-symbols/content-copy?width=24px&height=24px'
import MaterialSymbolsUndo from '~icons/material-symbols/undo?width=24px&height=24px'
import MaterialSymbolsRedo from '~icons/material-symbols/redo?width=24px&height=24px'
import MaterialSymbolsContentCut from '~icons/material-symbols/content-cut?width=24px&height=24px'
import MaterialSymbolsContentPaste from '~icons/material-symbols/content-paste?width=24px&height=24px'
import MaterialSymbolsMarkdownCopy from '~icons/material-symbols/markdown-copy?width=24px&height=24px'
import MaterialSymbolsMerge from '~icons/material-symbols/merge?width=24px&height=24px'
import MaterialSymbolsAttachment from '~icons/material-symbols/attachment?width=24px&height=24px'
import MaterialSymbolsCheck from '~icons/material-symbols/check?width=24px&height=24px'
import MaterialSymbolsCheckBoxOutlineBlank from '~icons/material-symbols/check-box-outline-blank?width=24px&height=24px'
import MaterialSymbolsCheckBoxOutline from '~icons/material-symbols/check-box-outline?width=24px&height=24px'
import MaterialSymbolsArrowUpwardRounded from '~icons/material-symbols/arrow-upward-rounded?width=24px&height=24px'
import MaterialSymbolsKeyboardArrowDown from '~icons/material-symbols/keyboard-arrow-down?width=24px&height=24px'
import MaterialSymbolsTextSelectStart from '~icons/material-symbols/text-select-start?width=24px&height=24px'
import MaterialSymbolsOpenInFull from '~icons/material-symbols/open-in-full?width=24px&height=24px'
import MaterialSymbolsOpenInNew from '~icons/material-symbols/open-in-new?width=24px&height=24px'
import MaterialSymbolsDragIndicator from '~icons/material-symbols/drag-indicator?width=24px&height=24px'
import MaterialSymbolsFileSave from '~icons/material-symbols/file-save?width=24px&height=24px'
import MaterialSymbolsVisibility from '~icons/material-symbols/visibility?width=24px&height=24px'
import MaterialSymbolsVisibilityOff from '~icons/material-symbols/visibility-off?width=24px&height=24px'
import MaterialSymbolsUnfoldLess from '~icons/material-symbols/unfold-less?width=24px&height=24px'
import MaterialSymbolsFormatImageLeft from '~icons/material-symbols/format-image-left?width=24px&height=24px'
import MaterialSymbolsFormatImageRight from '~icons/material-symbols/format-image-right?width=24px&height=24px'
import MaterialSymbolsFormatClear from '~icons/material-symbols/format-clear?width=24px&height=24px'
import MaterialSymbolsVariableRemove from '~icons/material-symbols/variable-remove?width=24px&height=24px'
import MaterialSymbolsToggleOn from '~icons/material-symbols/toggle-on?width=24px&height=24px'
import MaterialSymbolsToggleOff from '~icons/material-symbols/toggle-off?width=24px&height=24px'
import MaterialSymbolsAddRowAbove from '~icons/material-symbols/add-row-above?width=24px&height=24px'
import MaterialSymbolsAddRowBelow from '~icons/material-symbols/add-row-below?width=24px&height=24px'
import MaterialSymbolsAddColumnLeftOutline from '~icons/material-symbols/add-column-left-outline?width=24px&height=24px'
import MaterialSymbolsAddColumnRightOutline from '~icons/material-symbols/add-column-right-outline?width=24px&height=24px'
import MaterialSymbolsGrid3x3 from '~icons/material-symbols/grid-3x3?width=24px&height=24px'
import MaterialSymbolsCloud from '~icons/material-symbols/cloud?width=24px&height=24px'
import MaterialSymbolsCloudOff from '~icons/material-symbols/cloud-off?width=24px&height=24px'
import MaterialSymbolsLink from '~icons/material-symbols/link?width=24px&height=24px'
import MaterialSymbolsGroup from '~icons/material-symbols/group?width=24px&height=24px'
import MaterialSymbolsFolder from '~icons/material-symbols/folder?width=24px&height=24px'
import MaterialSymbolsFolderOpen from '~icons/material-symbols/folder-open?width=24px&height=24px'
import MaterialSymbolsDescription from '~icons/material-symbols/description?width=24px&height=24px'
import MaterialSymbolsHomeRepairServiceOutlineRounded from '~icons/material-symbols/home-repair-service-outline-rounded?width=24px&height=24px'
import MaterialSymbolsHelpCenterOutline from '~icons/material-symbols/help-center-outline?width=24px&height=24px'
import MaterialSymbolsChevronRight from '~icons/material-symbols/chevron-right?width=24px&height=24px'
import MaterialSymbolsChevronLeft from '~icons/material-symbols/chevron-left'
import MaterialSymbolsStop from '~icons/material-symbols/stop?width=24px&height=24px'
import MaterialSymbolsRefresh from '~icons/material-symbols/refresh?width=24px&height=24px'

import PixelarticonsFloatCenter from '~icons/pixelarticons/float-center?width=24px&height=24px'
import MdiTableColumnRemove from '~icons/mdi/table-column-remove?width=24px&height=24px'
import MdiTableRowRemove from '~icons/mdi/table-row-remove?width=24px&height=24px'

import javascript from '~icons/simple-icons/javascript'
import typescript from '~icons/simple-icons/typescript'
import react from '~icons/simple-icons/react'
import python from '~icons/simple-icons/python'
import rust from '~icons/simple-icons/rust'
import html from '~icons/simple-icons/html5'
import css from '~icons/simple-icons/css'
import java from '~icons/mdi/language-java'
import kotlin from '~icons/simple-icons/kotlin'
import json from '~icons/simple-icons/json'
import cpp from '~icons/simple-icons/cplusplus'
import markdown from '~icons/simple-icons/markdown'
import xml from '~icons/simple-icons/xml'
import php from '~icons/simple-icons/php'
import haskell from '~icons/simple-icons/haskell'
import clojure from '~icons/simple-icons/clojure'
import erlang from '~icons/simple-icons/erlang'
import groovy from '~icons/simple-icons/apachegroovy'
import ruby from '~icons/simple-icons/ruby'
import hcl from '~icons/simple-icons/hcl'
import mermaid from '~icons/simple-icons/mermaid'
import sh from '~icons/mdi/dollar'
import yaml from '~icons/simple-icons/yaml'
import go from '~icons/simple-icons/go'
import toml from '~icons/simple-icons/toml'
import lua from '~icons/simple-icons/lua'

import {findCodeLang} from '@/codemirror/highlight'

const langIcons: Record<string, any> = {
  javascript,
  typescript,
  tsx: react,
  jsx: react,
  python,
  rust,
  html,
  css,
  java,
  kotlin,
  json,
  cpp,
  markdown,
  xml,
  php,
  haskell,
  clojure,
  erlang,
  groovy,
  ruby,
  hcl,
  mermaid,
  sh,
  yaml,
  go,
  toml,
  lua,
}

export const LangIcon = (props: {name?: string}) => {
  const lang = findCodeLang(props.name ?? '')
  const Icon = langIcons[lang ?? ''] ?? (() => <MaterialSymbolsCodeBlocks />)
  return lang ?
      <SvgIcon>
        <Dynamic component={Icon} />
      </SvgIcon>
    : <IconCodeBlocks />
}

const SvgIconEl = styled('span')`
  display: flex;
  align-items: center;
  justify-content: center;
  svg {
    height: 20px;
    width: 20px;
  }
`

const SvgIcon = ({children}: {children: JSX.Element}) => (
  <SvgIconEl class="icon">{children}</SvgIconEl>
)

// ai icons

export const IconAi = () => (
  <SvgIcon>
    <MingcuteAiLine />
  </SvgIcon>
)

export const IconAiAssistant = () => (
  <SvgIcon>
    <OcticonCopilot16 />
  </SvgIcon>
)

export const IconAiAssistantClose = () => (
  <SvgIcon>
    <OcticonCopilotError16 />
  </SvgIcon>
)

// logos

export const IconPrettier = () => (
  <SvgIcon>
    <SimpleIconsPrettier />
  </SvgIcon>
)

// material

export const IconMoreVert = () => (
  <SvgIcon>
    <MaterialSymbolsMoreVert />
  </SvgIcon>
)

export const IconMoreHoriz = () => (
  <SvgIcon>
    <MaterialSymbolsMoreHoriz />
  </SvgIcon>
)

export const IconClose = () => (
  <SvgIcon>
    <MaterialSymbolsClose />
  </SvgIcon>
)

export const IconArrowBack = () => (
  <SvgIcon>
    <MaterialSymbolsArrowBack />
  </SvgIcon>
)

export const IconContrast = () => (
  <SvgIcon>
    <MaterialSymbolsContrast />
  </SvgIcon>
)

export const IconHistory = () => (
  <SvgIcon>
    <MaterialSymbolsHistory />
  </SvgIcon>
)

export const IconFullscreen = () => (
  <SvgIcon>
    <MaterialSymbolsFullscreen />
  </SvgIcon>
)

export const IconVerticalAlignCenter = () => (
  <SvgIcon>
    <MaterialSymbolsVerticalAlignCenter />
  </SvgIcon>
)

export const IconSpellcheck = () => (
  <SvgIcon>
    <MaterialSymbolsSpellcheck />
  </SvgIcon>
)

export const IconDesktopLandscape = () => (
  <SvgIcon>
    <MaterialSymbolsDesktopLandscape />
  </SvgIcon>
)

export const IconLanguage = () => (
  <SvgIcon>
    <MaterialSymbolsLanguage />
  </SvgIcon>
)

export const IconSaveAs = () => (
  <SvgIcon>
    <MaterialSymbolsSaveAs />
  </SvgIcon>
)

export const IconGesture = () => (
  <SvgIcon>
    <MaterialSymbolsGesture />
  </SvgIcon>
)

export const IconTextSnippet = () => (
  <SvgIcon>
    <MaterialSymbolsTextSnippet />
  </SvgIcon>
)

export const IconAdd = () => (
  <SvgIcon>
    <MaterialSymbolsAdd />
  </SvgIcon>
)

export const IconDelete = () => (
  <SvgIcon>
    <MaterialSymbolsDelete />
  </SvgIcon>
)

export const IconDeleteForever = () => (
  <SvgIcon>
    <MaterialSymbolsDeleteForever />
  </SvgIcon>
)

export const IconAdjust = () => (
  <SvgIcon>
    <MaterialSymbolsCenterFocusWeakOutline />
  </SvgIcon>
)

export const IconPostAdd = () => (
  <SvgIcon>
    <MaterialSymbolsPostAdd />
  </SvgIcon>
)

export const IconEdit = () => (
  <SvgIcon>
    <MaterialSymbolsEdit />
  </SvgIcon>
)

export const IconEditSquare = () => (
  <SvgIcon>
    <MaterialSymbolsEditSquareOutline />
  </SvgIcon>
)

export const IconCodeBlocks = () => (
  <SvgIcon>
    <MaterialSymbolsCodeBlocks />
  </SvgIcon>
)

export const IconContentCopy = () => (
  <SvgIcon>
    <MaterialSymbolsContentCopy />
  </SvgIcon>
)

export const IconContentCut = () => (
  <SvgIcon>
    <MaterialSymbolsContentCut />
  </SvgIcon>
)

export const IconContentPaste = () => (
  <SvgIcon>
    <MaterialSymbolsContentPaste />
  </SvgIcon>
)

export const IconMarkdownCopy = () => (
  <SvgIcon>
    <MaterialSymbolsMarkdownCopy />
  </SvgIcon>
)

export const IconUndo = () => (
  <SvgIcon>
    <MaterialSymbolsUndo />
  </SvgIcon>
)

export const IconRedo = () => (
  <SvgIcon>
    <MaterialSymbolsRedo />
  </SvgIcon>
)

export const IconMerge = () => (
  <SvgIcon>
    <MaterialSymbolsMerge />
  </SvgIcon>
)

export const IconAttachment = () => (
  <SvgIcon>
    <MaterialSymbolsAttachment />
  </SvgIcon>
)

export const IconCheck = () => (
  <SvgIcon>
    <MaterialSymbolsCheck />
  </SvgIcon>
)

export const IconCheckBox = () => (
  <SvgIcon>
    <MaterialSymbolsCheckBoxOutline />
  </SvgIcon>
)

export const IconCheckBoxBlank = () => (
  <SvgIcon>
    <MaterialSymbolsCheckBoxOutlineBlank />
  </SvgIcon>
)

export const IconSend = () => (
  <SvgIcon>
    <MaterialSymbolsArrowUpwardRounded />
  </SvgIcon>
)

export const IconKeyboardArrowDown = () => (
  <SvgIcon>
    <MaterialSymbolsKeyboardArrowDown />
  </SvgIcon>
)

export const IconTextSelectStart = () => (
  <SvgIcon>
    <MaterialSymbolsTextSelectStart />
  </SvgIcon>
)

export const IconOpenInFull = () => (
  <SvgIcon>
    <MaterialSymbolsOpenInFull />
  </SvgIcon>
)

export const IconOpenInNew = () => (
  <SvgIcon>
    <MaterialSymbolsOpenInNew />
  </SvgIcon>
)

export const IconDragIndicator = () => (
  <SvgIcon>
    <MaterialSymbolsDragIndicator />
  </SvgIcon>
)

export const IconFileSave = () => (
  <SvgIcon>
    <MaterialSymbolsFileSave />
  </SvgIcon>
)

export const IconVisibility = () => (
  <SvgIcon>
    <MaterialSymbolsVisibility />
  </SvgIcon>
)

export const IconVisibilityOff = () => (
  <SvgIcon>
    <MaterialSymbolsVisibilityOff />
  </SvgIcon>
)

export const IconUnfoldLess = () => (
  <SvgIcon>
    <MaterialSymbolsUnfoldLess />
  </SvgIcon>
)

export const IconFormatImageLeft = () => (
  <SvgIcon>
    <MaterialSymbolsFormatImageLeft />
  </SvgIcon>
)

export const IconFormatImageRight = () => (
  <SvgIcon>
    <MaterialSymbolsFormatImageRight />
  </SvgIcon>
)

export const IconFormatClear = () => (
  <SvgIcon>
    <MaterialSymbolsFormatClear />
  </SvgIcon>
)

export const IconVariableRemove = () => (
  <SvgIcon>
    <MaterialSymbolsVariableRemove />
  </SvgIcon>
)

export const IconToggleOn = () => (
  <SvgIcon>
    <MaterialSymbolsToggleOn />
  </SvgIcon>
)

export const IconToggleOff = () => (
  <SvgIcon>
    <MaterialSymbolsToggleOff />
  </SvgIcon>
)

export const IconAddRowAbove = () => (
  <SvgIcon>
    <MaterialSymbolsAddRowAbove />
  </SvgIcon>
)

export const IconAddRowBelow = () => (
  <SvgIcon>
    <MaterialSymbolsAddRowBelow />
  </SvgIcon>
)

export const IconAddColumnLeft = () => (
  <SvgIcon>
    <MaterialSymbolsAddColumnLeftOutline />
  </SvgIcon>
)

export const IconAddColumnRight = () => (
  <SvgIcon>
    <MaterialSymbolsAddColumnRightOutline />
  </SvgIcon>
)

export const IconGrid3x3 = () => (
  <SvgIcon>
    <MaterialSymbolsGrid3x3 />
  </SvgIcon>
)

export const IconCloud = () => (
  <SvgIcon>
    <MaterialSymbolsCloud />
  </SvgIcon>
)

export const IconCloudOff = () => (
  <SvgIcon>
    <MaterialSymbolsCloudOff />
  </SvgIcon>
)

export const IconLink = () => (
  <SvgIcon>
    <MaterialSymbolsLink />
  </SvgIcon>
)

export const IconGroup = () => (
  <SvgIcon>
    <MaterialSymbolsGroup />
  </SvgIcon>
)

export const IconFolder = () => (
  <SvgIcon>
    <MaterialSymbolsFolder />
  </SvgIcon>
)

export const IconFolderOpen = () => (
  <SvgIcon>
    <MaterialSymbolsFolderOpen />
  </SvgIcon>
)

export const IconDescription = () => (
  <SvgIcon>
    <MaterialSymbolsDescription />
  </SvgIcon>
)

export const IconRepair = () => (
  <SvgIcon>
    <MaterialSymbolsHomeRepairServiceOutlineRounded />
  </SvgIcon>
)

export const IconHelp = () => (
  <SvgIcon>
    <MaterialSymbolsHelpCenterOutline />
  </SvgIcon>
)

export const IconChevronRight = () => (
  <SvgIcon>
    <MaterialSymbolsChevronRight />
  </SvgIcon>
)

export const IconChevronLeft = () => (
  <SvgIcon>
    <MaterialSymbolsChevronLeft />
  </SvgIcon>
)

export const IconStop = () => (
  <SvgIcon>
    <MaterialSymbolsStop />
  </SvgIcon>
)

export const IconRefresh = () => (
  <SvgIcon>
    <MaterialSymbolsRefresh />
  </SvgIcon>
)

// other

export const IconFloatCenter = () => (
  <SvgIcon>
    <PixelarticonsFloatCenter />
  </SvgIcon>
)

export const IconColumnRemove = () => (
  <SvgIcon>
    <MdiTableColumnRemove />
  </SvgIcon>
)

export const IconRowRemove = () => (
  <SvgIcon>
    <MdiTableRowRemove />
  </SvgIcon>
)

const spinnerStyle = `.spinner_P7sC{transform-origin:center;animation:spinner_svv2 .75s infinite linear}@keyframes spinner_svv2{100%{transform:rotate(360deg)}}`
export const Spinner = () => (
  <SvgIcon>
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <style>{spinnerStyle}</style>
      <path
        fill="currentColor"
        d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
        class="spinner_P7sC"
      />
    </svg>
  </SvgIcon>
)
