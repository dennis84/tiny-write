import type {JSX} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {styled} from 'solid-styled-components'
import {findCodeLang} from '@/codemirror/highlight'
import MaterialSymbolsAdd from '~icons/material-symbols/add'
import MaterialSymbolsAddColumnLeftOutline from '~icons/material-symbols/add-column-left-outline'
import MaterialSymbolsAddColumnRightOutline from '~icons/material-symbols/add-column-right-outline'
import MaterialSymbolsAddRowAbove from '~icons/material-symbols/add-row-above'
import MaterialSymbolsAddRowBelow from '~icons/material-symbols/add-row-below'
import MaterialSymbolsArrowBack from '~icons/material-symbols/arrow-back'
import MaterialSymbolsArrowUpwardRounded from '~icons/material-symbols/arrow-upward-rounded'
import MaterialSymbolsAttachment from '~icons/material-symbols/attachment'
import MaterialSymbolsCenterFocusWeakOutline from '~icons/material-symbols/center-focus-weak-outline'
import MaterialSymbolsCheck from '~icons/material-symbols/check'
import MaterialSymbolsCheckBoxOutline from '~icons/material-symbols/check-box-outline'
import MaterialSymbolsCheckBoxOutlineBlank from '~icons/material-symbols/check-box-outline-blank'
import MaterialSymbolsChevronLeft from '~icons/material-symbols/chevron-left'
import MaterialSymbolsChevronRight from '~icons/material-symbols/chevron-right'
import MaterialSymbolsClose from '~icons/material-symbols/close'
import MaterialSymbolsCloud from '~icons/material-symbols/cloud'
import MaterialSymbolsCloudOff from '~icons/material-symbols/cloud-off'
import MaterialSymbolsCodeBlocks from '~icons/material-symbols/code-blocks'
import MaterialSymbolsContentCopy from '~icons/material-symbols/content-copy'
import MaterialSymbolsContentCut from '~icons/material-symbols/content-cut'
import MaterialSymbolsContentPaste from '~icons/material-symbols/content-paste'
import MaterialSymbolsContrast from '~icons/material-symbols/contrast'
import MaterialSymbolsDelete from '~icons/material-symbols/delete'
import MaterialSymbolsDeleteForever from '~icons/material-symbols/delete-forever'
import MaterialSymbolsDescription from '~icons/material-symbols/description'
import MaterialSymbolsDesktopLandscape from '~icons/material-symbols/desktop-landscape'
import MaterialSymbolsDragIndicator from '~icons/material-symbols/drag-indicator'
import MaterialSymbolsEdit from '~icons/material-symbols/edit'
import MaterialSymbolsEditSquareOutline from '~icons/material-symbols/edit-square-outline'
import MaterialSymbolsFileSave from '~icons/material-symbols/file-save'
import MaterialSymbolsFolder from '~icons/material-symbols/folder'
import MaterialSymbolsFolderOpen from '~icons/material-symbols/folder-open'
import MaterialSymbolsFormatClear from '~icons/material-symbols/format-clear'
import MaterialSymbolsFormatImageLeft from '~icons/material-symbols/format-image-left'
import MaterialSymbolsFormatImageRight from '~icons/material-symbols/format-image-right'
import MaterialSymbolsFullscreen from '~icons/material-symbols/fullscreen'
import MaterialSymbolsGesture from '~icons/material-symbols/gesture'
import MaterialSymbolsGrid3x3 from '~icons/material-symbols/grid-3x3'
import MaterialSymbolsGroup from '~icons/material-symbols/group'
import MaterialSymbolsHelpCenterOutline from '~icons/material-symbols/help-center-outline'
import MaterialSymbolsHistory from '~icons/material-symbols/history'
import MaterialSymbolsHomeRepairServiceOutlineRounded from '~icons/material-symbols/home-repair-service-outline-rounded'
import MaterialSymbolsImage from '~icons/material-symbols/image'
import MaterialSymbolsKeyboardArrowDown from '~icons/material-symbols/keyboard-arrow-down'
import MaterialSymbolsLanguage from '~icons/material-symbols/language'
import MaterialSymbolsLink from '~icons/material-symbols/link'
import MaterialSymbolsMarkdownCopy from '~icons/material-symbols/markdown-copy'
import MaterialSymbolsMerge from '~icons/material-symbols/merge'
import MaterialSymbolsMoreHoriz from '~icons/material-symbols/more-horiz'
import MaterialSymbolsMoreVert from '~icons/material-symbols/more-vert'
import MaterialSymbolsOpenInFull from '~icons/material-symbols/open-in-full'
import MaterialSymbolsOpenInNew from '~icons/material-symbols/open-in-new'
import MaterialSymbolsPostAdd from '~icons/material-symbols/post-add'
import MaterialSymbolsRedo from '~icons/material-symbols/redo'
import MaterialSymbolsRefresh from '~icons/material-symbols/refresh'
import MaterialSymbolsSaveAs from '~icons/material-symbols/save-as'
import MaterialSymbolsSpellcheck from '~icons/material-symbols/spellcheck'
import MaterialSymbolsStop from '~icons/material-symbols/stop'
import MaterialSymbolsTextSelectStart from '~icons/material-symbols/text-select-start'
import MaterialSymbolsTextSnippet from '~icons/material-symbols/text-snippet'
import MaterialSymbolsToggleOff from '~icons/material-symbols/toggle-off'
import MaterialSymbolsToggleOn from '~icons/material-symbols/toggle-on'
import MaterialSymbolsUndo from '~icons/material-symbols/undo'
import MaterialSymbolsUnfoldLess from '~icons/material-symbols/unfold-less'
import MaterialSymbolsVariableRemove from '~icons/material-symbols/variable-remove'
import MaterialSymbolsVerticalAlignCenter from '~icons/material-symbols/vertical-align-center'
import MaterialSymbolsVisibility from '~icons/material-symbols/visibility'
import MaterialSymbolsVisibilityOff from '~icons/material-symbols/visibility-off'
import sh from '~icons/mdi/dollar'
import java from '~icons/mdi/language-java'
import MdiTableColumnRemove from '~icons/mdi/table-column-remove'
import MdiTableRowRemove from '~icons/mdi/table-row-remove'
import MingcuteAiLine from '~icons/mingcute/ai-line'
import OcticonCopilot16 from '~icons/octicon/copilot-16'
import OcticonCopilotError16 from '~icons/octicon/copilot-error-16'
import PixelarticonsFloatCenter from '~icons/pixelarticons/float-center'
import groovy from '~icons/simple-icons/apachegroovy'
import clojure from '~icons/simple-icons/clojure'
import cpp from '~icons/simple-icons/cplusplus'
import css from '~icons/simple-icons/css'
import erlang from '~icons/simple-icons/erlang'
import go from '~icons/simple-icons/go'
import haskell from '~icons/simple-icons/haskell'
import hcl from '~icons/simple-icons/hcl'
import html from '~icons/simple-icons/html5'
import javascript from '~icons/simple-icons/javascript'
import json from '~icons/simple-icons/json'
import kotlin from '~icons/simple-icons/kotlin'
import lua from '~icons/simple-icons/lua'
import markdown from '~icons/simple-icons/markdown'
import mermaid from '~icons/simple-icons/mermaid'
import php from '~icons/simple-icons/php'
import SimpleIconsPrettier from '~icons/simple-icons/prettier'
import python from '~icons/simple-icons/python'
import react from '~icons/simple-icons/react'
import ruby from '~icons/simple-icons/ruby'
import rust from '~icons/simple-icons/rust'
import toml from '~icons/simple-icons/toml'
import typescript from '~icons/simple-icons/typescript'
import xml from '~icons/simple-icons/xml'
import yaml from '~icons/simple-icons/yaml'

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
  return lang ? (
    <SvgIcon>
      <Dynamic component={Icon} />
    </SvgIcon>
  ) : (
    <IconCodeBlocks />
  )
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

export const IconImage = () => (
  <SvgIcon>
    <MaterialSymbolsImage />
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
      <title>...</title>
      <style>{spinnerStyle}</style>
      <path
        fill="currentColor"
        d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
        class="spinner_P7sC"
      />
    </svg>
  </SvgIcon>
)
