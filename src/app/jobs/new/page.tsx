'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useWizard, ClarifyQuestion } from '@/hooks/useWizard'
import ProgressBar from '@/components/ProgressBar'
import TypeBadge from '@/components/TypeBadge'
import ConfigCard from '@/components/ConfigCard'
import { WIZARD_STEPS, EXAMPLE_CHIPS } from '@/lib/constants'
import { JobType } from '@/lib/types'

// ─── Step 1: Describe ───
function StepDescribe({
  description,
  isLoading,
  onDescriptionChange,
  onSubmit,
}: {
  description: string
  isLoading: boolean
  onDescriptionChange: (v: string) => void
  onSubmit: () => void
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && description.trim()) {
        onSubmit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [description, onSubmit])

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">What do you want to automate?</h2>
      <p className="text-sm text-gray-500 mb-6">Describe your job in plain English. We&apos;ll figure out the rest.</p>

      <textarea
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="e.g. Send me a daily summary of the top Hacker News posts every morning at 8am..."
        className="w-full h-36 px-4 py-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        autoFocus
      />

      <div className="flex flex-wrap gap-2 mt-4 mb-6">
        {EXAMPLE_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => onDescriptionChange(chip)}
            className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      <button
        onClick={onSubmit}
        disabled={!description.trim() || isLoading}
        className="w-full py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </>
        ) : (
          <>Continue <span className="text-xs opacity-60">⌘↵</span></>
        )}
      </button>
    </div>
  )
}

// ─── Step 2: Clarify ───
function StepClarify({
  description,
  questions,
  answers,
  isLoading,
  onAnswer,
  onSubmit,
}: {
  description: string
  questions: ClarifyQuestion[]
  answers: Record<string, string>
  isLoading: boolean
  onAnswer: (id: string, value: string) => void
  onSubmit: () => void
}) {
  const allAnswered = questions.every((q) => answers[q.id]?.trim())

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">A few quick questions</h2>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-700 italic">&ldquo;{description}&rdquo;</p>
      </div>

      <div className="space-y-6">
        {questions.map((q) => (
          <div key={q.id}>
            <label className="block text-sm font-medium text-gray-800 mb-2">{q.question}</label>
            {q.type === 'select' && q.options ? (
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => onAnswer(q.id, opt)}
                    className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                      answers[q.id] === opt
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={answers[q.id] || ''}
                onChange={(e) => onAnswer(q.id, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onSubmit}
        disabled={!allAnswered || isLoading}
        className="w-full mt-8 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Generating config...' : 'Generate config'}
      </button>
    </div>
  )
}

// ─── Step 3: Telegram ───
function StepTelegram({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config,
  telegramConfig,
  telegramSubStep,
  isLoading,
  error,
  onSetTelegramConfig,
  onSetSubStep,
  onConnect,
  onNext,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any> | null
  telegramConfig: { enabled: boolean; bot_token?: string; chat_id?: string }
  telegramSubStep: number
  isLoading: boolean
  error: string | null
  onSetTelegramConfig: (c: Record<string, unknown>) => void
  onSetSubStep: (n: number) => void
  onConnect: (token: string) => Promise<string | null>
  onNext: () => void
}) {
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const tokenValid = /^\d+:[A-Za-z0-9_-]{35,}$/.test(token)

  const jobName = config?.name || 'my-job'
  const suggestedUsername = jobName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_bot'

  if (!telegramConfig.enabled && telegramSubStep === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Set up Telegram notifications?</h2>
        <p className="text-sm text-gray-500 mb-8">Get notified about job results via Telegram.</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              onSetTelegramConfig({ enabled: true })
              onSetSubStep(1)
            }}
            className="px-6 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Yes, set it up
          </button>
          <button
            onClick={onNext}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    )
  }

  if (telegramSubStep === 1) {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create your Telegram bot</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-900 space-y-2">
          <p>1. Open Telegram and search for <strong>@BotFather</strong></p>
          <p>2. Send <code className="bg-blue-100 px-1 rounded">/newbot</code></p>
          <p>3. Set the name to <strong>{jobName}</strong></p>
          <p>4. Set the username to <strong>{suggestedUsername}</strong></p>
          <p>5. Copy the API token BotFather gives you</p>
        </div>
        <button
          onClick={() => onSetSubStep(2)}
          className="w-full py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          I created the bot &rarr;
        </button>
      </div>
    )
  }

  if (telegramSubStep === 2) {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Enter your bot token</h2>
        <div className="relative mb-4">
          <input
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="123456789:ABCDefgh..."
            className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
          <button
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
          >
            {showToken ? 'Hide' : 'Show'}
          </button>
        </div>
        {token && !tokenValid && (
          <p className="text-xs text-red-500 mb-4">Invalid token format</p>
        )}
        <button
          onClick={() => onSetSubStep(3)}
          disabled={!tokenValid}
          className="w-full py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next &rarr;
        </button>
      </div>
    )
  }

  // Sub-step 3: Connect
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Connect your chat</h2>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-900">
        <p>Send any message to your bot in Telegram, then click the button below.</p>
      </div>

      {!telegramConfig.chat_id ? (
        <button
          onClick={() => onConnect(token)}
          disabled={isLoading}
          className="w-full py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors mb-4"
        >
          {isLoading ? 'Finding chat ID...' : 'Find my chat ID'}
        </button>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-800">
            Connected! Chat ID: <code className="font-mono bg-green-100 px-1 rounded">{telegramConfig.chat_id}</code>
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {telegramConfig.chat_id && (
        <button
          onClick={onNext}
          className="w-full py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          Continue &rarr;
        </button>
      )}
    </div>
  )
}

// ─── Step 4: Review ───
function StepReview({
  config,
  telegramConfig,
  isLoading,
  onSubmit,
  onChangeAnswers,
  onStartOver,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any> | null
  telegramConfig: { enabled: boolean; bot_token?: string; chat_id?: string }
  isLoading: boolean
  onSubmit: () => void
  onChangeAnswers: () => void
  onStartOver: () => void
}) {
  if (!config) return null

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Review your job</h2>

      <div className="space-y-4 mb-8">
        {/* Job header */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            {config.type && <TypeBadge type={config.type as JobType} size="md" />}
            <h3 className="font-semibold text-gray-900">{config.name || 'Untitled Job'}</h3>
          </div>
          {config.description && <p className="text-sm text-gray-600 mb-3">{config.description}</p>}
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Schedule: <strong className="text-gray-700">{config.schedule_human || config.schedule}</strong></span>
          </div>
        </div>

        {/* Config */}
        {config.type && <ConfigCard type={config.type as JobType} config={config.config || config} />}

        {/* Telegram */}
        {telegramConfig.enabled && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Telegram</h4>
            <p className="text-sm text-gray-600">Notifications enabled &bull; Chat ID: {telegramConfig.chat_id}</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={onSubmit}
          disabled={isLoading}
          className="w-full py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Adding to dashboard...' : 'Add to dashboard'}
        </button>
        <div className="flex gap-3">
          <button onClick={onChangeAnswers} className="flex-1 py-2 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Change answers
          </button>
          <button onClick={onStartOver} className="flex-1 py-2 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Start over
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Wizard Page ───
export default function NewJobPage() {
  const router = useRouter()
  const { state, dispatch, submitDescription, submitAnswers, connectTelegram, submitJob } = useWizard()

  async function handleSubmitJob() {
    const result = await submitJob()
    if (result?.id) {
      router.push(`/jobs/${result.id}`)
    }
  }

  return (
    <div className="p-8">
      <ProgressBar currentStep={state.step} steps={WIZARD_STEPS} />

      {state.error && (
        <div className="max-w-2xl mx-auto mb-6 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.step === 0 && (
        <StepDescribe
          description={state.description}
          isLoading={state.isLoading}
          onDescriptionChange={(v) => dispatch({ type: 'SET_DESCRIPTION', payload: v })}
          onSubmit={submitDescription}
        />
      )}

      {state.step === 1 && (
        <StepClarify
          description={state.description}
          questions={state.clarifyQuestions}
          answers={state.clarifyAnswers}
          isLoading={state.isLoading}
          onAnswer={(id, value) => dispatch({ type: 'SET_CLARIFY_ANSWER', payload: { id, value } })}
          onSubmit={submitAnswers}
        />
      )}

      {state.step === 2 && (
        <StepTelegram
          config={state.generatedConfig}
          telegramConfig={state.telegramConfig}
          telegramSubStep={state.telegramSubStep}
          isLoading={state.isLoading}
          error={state.error}
          onSetTelegramConfig={(c) => dispatch({ type: 'SET_TELEGRAM_CONFIG', payload: c })}
          onSetSubStep={(n) => dispatch({ type: 'SET_TELEGRAM_SUB_STEP', payload: n })}
          onConnect={connectTelegram}
          onNext={() => dispatch({ type: 'NEXT_STEP' })}
        />
      )}

      {state.step === 3 && (
        <StepReview
          config={state.generatedConfig}
          telegramConfig={state.telegramConfig}
          isLoading={state.isLoading}
          onSubmit={handleSubmitJob}
          onChangeAnswers={() => dispatch({ type: 'GO_TO_STEP', payload: 1 })}
          onStartOver={() => dispatch({ type: 'START_OVER' })}
        />
      )}
    </div>
  )
}
