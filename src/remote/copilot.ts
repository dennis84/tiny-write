import {Channel, invoke} from '@tauri-apps/api/core'
import {timeout} from '@/utils/promise'
import {ChatMessage, Model} from '@/services/CopilotService'
import {span} from './log'

export const startLanguageServer = () =>
  span('start_language_server', () => {
    return Promise.race([invoke('copilot_start_language_server'), timeout(5000)])
  })

export const disconnectCopilot = async () => {
  return await invoke('copilot_disconnect')
}

export type CopilotStatus = {user: string; accessToken?: string}

export const copilotStatus = async (): Promise<CopilotStatus> => {
  return await Promise.race<CopilotStatus>([invoke('copilot_status'), timeout(5000)])
}

export type CopilotSignIn = {userCode: string; deviceCode?: string; verificationUri: string}

export const copilotSignIn = async (): Promise<CopilotSignIn> => {
  return await invoke('copilot_sign_in')
}

type CopilotCompletion = {completions: {displayText: string}[]}

export const copilotCompletion = async (
  path: string | undefined,
  pos: number,
  tabWidth: number,
  useTabs: boolean,
): Promise<CopilotCompletion> => {
  return await invoke('copilot_completion', {path, pos, tabWidth, useTabs})
}

type ChatEvent = string

export const sendChatMessage = async (
  model: Model,
  messages: ChatMessage[],
  onEvent: Channel<ChatEvent>,
) => {
  await invoke('copilot_chat_completions', {model, messages, onEvent})
}
