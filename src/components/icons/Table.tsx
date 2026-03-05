import LucideTable from '~icons/lucide/table'
import MajesticonsAddColumn from '~icons/majesticons/add-column'
import MajesticonsAddRow from '~icons/majesticons/add-row'
import MajesticonsRemoveColumn from '~icons/majesticons/remove-column'
import {SvgIcon} from './Style'

export const IconAddRowAbove = () => (
  <SvgIcon flip="vertical">
    <MajesticonsAddRow />
  </SvgIcon>
)

export const IconAddRowBelow = () => (
  <SvgIcon>
    <MajesticonsAddRow />
  </SvgIcon>
)

export const IconAddColumnLeft = () => (
  <SvgIcon>
    <MajesticonsAddColumn />
  </SvgIcon>
)

export const IconAddColumnRight = () => (
  <SvgIcon flip="horzontal">
    <MajesticonsAddColumn />
  </SvgIcon>
)

export const IconColumnRemove = () => (
  <SvgIcon>
    <MajesticonsRemoveColumn />
  </SvgIcon>
)

import MajesticonsRemoveRow from '~icons/majesticons/remove-row'
export const IconRowRemove = () => (
  <SvgIcon>
    <MajesticonsRemoveRow />
  </SvgIcon>
)

export const IconTable = () => (
  <SvgIcon>
    <LucideTable />
  </SvgIcon>
)
