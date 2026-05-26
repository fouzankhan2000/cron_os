'use client'

import { useReducer } from 'react'
import { TelegramConfig } from '@/lib/types'

export interface ClarifyQuestion {
  id: string
  question: string
  type: 'select' | 'text'
  options?: string[]
}

interface WizardState {
  step: number
  description: string
  clarifyQuestions: ClarifyQuestion[]
  clarifyAnswers: Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generatedConfig: Record<string, any> | null
  telegramConfig: TelegramConfig
  telegramSubStep: number
  isLoading: boolean
  error: string | null
}

type WizardAction =
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CLARIFY_QUESTIONS'; payload: ClarifyQuestion[] }
  | { type: 'SET_CLARIFY_ANSWER'; payload: { id: string; value: string } }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { type: 'SET_GENERATED_CONFIG'; payload: Record<string, any> }
  | { type: 'SET_TELEGRAM_CONFIG'; payload: Partial<TelegramConfig> }
  | { type: 'SET_TELEGRAM_SUB_STEP'; payload: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GO_TO_STEP'; payload: number }
  | { type: 'START_OVER' }

const initialState: WizardState = {
  step: 0,
  description: '',
  clarifyQuestions: [],
  clarifyAnswers: {},
  generatedConfig: null,
  telegramConfig: { enabled: false },
  telegramSubStep: 0,
  isLoading: false,
  error: null,
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_DESCRIPTION':
      return { ...state, description: action.payload }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    case 'SET_CLARIFY_QUESTIONS':
      return { ...state, clarifyQuestions: action.payload, isLoading: false }
    case 'SET_CLARIFY_ANSWER':
      return { ...state, clarifyAnswers: { ...state.clarifyAnswers, [action.payload.id]: action.payload.value } }
    case 'SET_GENERATED_CONFIG':
      return { ...state, generatedConfig: action.payload, isLoading: false }
    case 'SET_TELEGRAM_CONFIG':
      return { ...state, telegramConfig: { ...state.telegramConfig, ...action.payload } }
    case 'SET_TELEGRAM_SUB_STEP':
      return { ...state, telegramSubStep: action.payload }
    case 'NEXT_STEP':
      return { ...state, step: Math.min(state.step + 1, 3) }
    case 'PREV_STEP':
      return { ...state, step: Math.max(state.step - 1, 0) }
    case 'GO_TO_STEP':
      return { ...state, step: action.payload }
    case 'START_OVER':
      return { ...initialState }
    default:
      return state
  }
}

export function useWizard() {
  const [state, dispatch] = useReducer(wizardReducer, initialState)

  async function submitDescription() {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const res = await fetch('/api/jobs/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: state.description }),
      })
      const data = await res.json()
      if (data.questions && data.questions.length > 0) {
        dispatch({ type: 'SET_CLARIFY_QUESTIONS', payload: data.questions })
        dispatch({ type: 'NEXT_STEP' })
      } else {
        // No clarification needed — generate config directly
        const genRes = await fetch('/api/jobs/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: state.description }),
        })
        const genData = await genRes.json()
        dispatch({ type: 'SET_GENERATED_CONFIG', payload: genData })
        dispatch({ type: 'GO_TO_STEP', payload: 2 })
      }
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to process description' })
    }
  }

  async function submitAnswers() {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const res = await fetch('/api/jobs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: state.description,
          answers: state.clarifyAnswers,
        }),
      })
      const data = await res.json()
      dispatch({ type: 'SET_GENERATED_CONFIG', payload: data })
      dispatch({ type: 'NEXT_STEP' })
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to generate config' })
    }
  }

  async function connectTelegram(token: string) {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const res = await fetch(`/api/telegram/connect?token=${encodeURIComponent(token)}`)
      const data = await res.json()
      if (data.chat_id) {
        dispatch({ type: 'SET_TELEGRAM_CONFIG', payload: { chat_id: data.chat_id, bot_token: token, enabled: true } })
        dispatch({ type: 'SET_LOADING', payload: false })
        return data.chat_id
      }
      dispatch({ type: 'SET_ERROR', payload: data.error || 'Could not find chat ID' })
      return null
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to connect Telegram' })
      return null
    }
  }

  async function submitJob() {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const config = {
        ...state.generatedConfig,
        telegram: state.telegramConfig,
      }
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      dispatch({ type: 'SET_LOADING', payload: false })
      return data
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create job' })
      return null
    }
  }

  return {
    state,
    dispatch,
    submitDescription,
    submitAnswers,
    connectTelegram,
    submitJob,
  }
}
