import {Channel, invoke} from '@tauri-apps/api/core'
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
  tabWidth: number,
  useTabs: boolean,
): Promise<CopilotCompletion> => {
  return await invoke('copilot_completion', {path, pos, tabWidth, useTabs})
}

export const copilotChatModels = (): Promise<string[]> => invoke('copilot_chat_models')

type ChatEvent = string

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export const sendChatMessage = async (
  model: string,
  messages: ChatMessage[],
  onEvent: Channel<ChatEvent>,
) => {
  await invoke('copilot_chat_message', {model, messages, onEvent})
}
