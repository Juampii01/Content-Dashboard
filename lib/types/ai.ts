import type { ClaudeModelId } from '@/lib/claude/models'

export interface ConversationDTO {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface AIMessageDTO {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  model: ClaudeModelId | null
  createdAt: string
}

export interface ListConversationsResponse {
  conversations: ConversationDTO[]
}

export interface GetConversationResponse {
  conversation: ConversationDTO
  messages: AIMessageDTO[]
}
