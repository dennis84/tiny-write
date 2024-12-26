import {
  currentMonitor,
  getCurrentWindow,
  PhysicalPosition,
  PhysicalSize,
} from '@tauri-apps/api/window'
import {Window} from '@/state'
import {info} from './log'

export const updateWindow = async ({width, height, x, y}: Window) => {
  info(`Update window: (width=${width}, height=${height}, x=${x}, y=${y})`)

  // Last size should not be too small, otherwise difficult to enlarge.
  if (width > 10 && height > 10) {
    await getCurrentWindow().setSize(new PhysicalSize(width, height))
  }

  const size = await getCurrentWindow().outerSize()
  const monitor = await currentMonitor()
  if (!monitor) return

  // Last pos must fit in current screen size.
  if (
    x >= 0 &&
    x < monitor.size.width - size.width &&
    y >= 0 &&
    y < monitor.size.height - size.height
  ) {
    await getCurrentWindow().setPosition(new PhysicalPosition(x, y))
  }
}

export const show = async () => {
  return await getCurrentWindow().show()
}
