import type { en } from '@/i18n/messages/en'

export type Locale = 'en' | 'es'

export type MessageKey = keyof typeof en

export type Messages = Record<MessageKey, string>
