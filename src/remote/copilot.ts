import {invoke} from '@tauri-apps/api/core'

export const connectCopilot = async () => {
  return await invoke('connect_copilot')
}

export const enableCopilot = async () => {
  return await invoke('enable_copilot')
}

export const disableCopilot = async () => {
  return await invoke('disable_copilot')
}

export const copilotStatus = async () => {
  return await invoke('copilot_status')
}

export const copilotSignIn = async () => {
  return await invoke('copilot_sign_in')
}

export const copilotCompletion = async (path: string | undefined, pos: number) => {
  return await invoke('copilot_completion', {path, pos})
}
