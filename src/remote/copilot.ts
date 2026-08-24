import {invoke} from '@tauri-apps/api/core'
import {timeout} from '@/utils/promise'

export const startLanguageServer = async () => {
  return await invoke('start_language_server', {languageId: 'copilot'})
}

export const disconnectCopilot = async () => {
  return await invoke('copilot_disconnect')
}

export type CopilotStatus = {user: string; accessToken?: string}

export const copilotStatus = async (): Promise<CopilotStatus> => {
  return await Promise.race<CopilotStatus>([invoke('copilot_status'), timeout(5000)])
}

export const copilotAuthToken = async (): Promise<string> => {
  return await invoke('copilot_auth_token')
}

export type CopilotAlreadySignedIn = {status: 'AlreadySignedIn'; user: string}
export type CopilotPromptUserDeviceFlow = {
  status: 'PromptUserDeviceFlow'
  userCode: string
  deviceCode?: string
  verificationUri: string
}

export type CopilotSignIn = CopilotAlreadySignedIn | CopilotPromptUserDeviceFlow

export const copilotSignIn = async (): Promise<CopilotSignIn> => {
  return await invoke('copilot_sign_in')
}

type CopilotCompletion = {completions: {text: string; displayText: string}[]}

export const copilotCompletion = async (
  path: string | undefined,
  pos: number,
  tabWidth: number,
  useTabs: boolean,
): Promise<CopilotCompletion> => {
  return await invoke('copilot_completion', {path, pos, tabWidth, useTabs})
}
