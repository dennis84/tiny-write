import {invoke} from '@tauri-apps/api/core'
import {timeout} from '@/utils/promise'

export const connectCopilot = async () => {
  return await invoke('connect_copilot')
}

export const enableCopilot = async (): Promise<void> => {
  await Promise.race([invoke('enable_copilot'), timeout(5000)])
}

export const disableCopilot = async () => {
  return await invoke('disable_copilot')
}

type CopilotStatus = {user: string}

export const copilotStatus = async (): Promise<CopilotStatus> => {
  return await Promise.race<CopilotStatus>([invoke('copilot_status'), timeout(5000)])
}

type CopilotSignIn = {userCode: string; verificationUri: string}

export const copilotSignIn = async (): Promise<CopilotSignIn> => {
  return await invoke('copilot_sign_in')
}

type CopilotCompletion = {completions: {displayText: string}[]}

export const copilotCompletion = async (
  path: string | undefined,
  pos: number,
): Promise<CopilotCompletion> => {
  return await invoke('copilot_completion', {path, pos})
}
