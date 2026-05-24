'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { CronJob, JobType } from '@/lib/types'
import ConfigCard from '@/components/ConfigCard'
import DiffView from '@/components/DiffView'
import { maskToken } from '@/lib/utils'

const QUICK_EDITS: Record<string, { label: string; types?: JobType[] }> = {
  schedule: { label: 'Change the schedule' },
  prompt: { label: 'Update the prompt', types: ['ai', 'storyteller'] },
  url: { label: 'Change the URL', types: ['http'] },
  tone: { label: 'Change the tone', types: ['social', 'storyteller'] },
  linkedin: { label: 'Add LinkedIn', types: ['social', 'storyteller'] },
  thread: { label: 'Change to thread', types: ['social', 'storyteller'] },
}

export default function EditJobPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [job, setJob] = useState<CronJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [changeDescription, setChangeDescription] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [proposedConfig, setProposedConfig] = useState<Record<string, any> | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [telegramExpanded, setTelegramExpanded] = useState(false)

  useEffect(() => {
    async function fetchJob() {
      const { data } = await supabase
        .from('cron_jobs')
        .select('*')
        .eq('id', params.id)
        .single()
      setJob(data)
      setLoading(false)
    }
    fetchJob()
  }, [params.id])

  const filteredChips = Object.entries(QUICK_EDITS).filter(
    ([, v]) => !v.types || (job && v.types.includes(job.type))
  )

  async function handleApplyChanges() {
    if (!job) return
    setIsApplying(true)
    setError(null)
    try {
      const res = await fetch(`/api/jobs/${params.id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: changeDescription, currentConfig: job }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setProposedConfig(data.config)
      }
    } catch {
      setError('Failed to apply changes')
    } finally {
      setIsApplying(false)
    }
  }

  async function handleSave() {
    if (!proposedConfig) return
    setIsSaving(true)
    try {
      await fetch(`/api/jobs/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposedConfig),
      })
      router.push(`/jobs/${params.id}`)
    } catch {
      setError('Failed to save changes')
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-48 bg-gray-100 rounded" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Job not found</h2>
          <Link href="/jobs" className="text-sm text-purple-600 hover:underline">Back to jobs</Link>
        </div>
      </div>
    )
  }

  const telegram = job.config?.telegram

  return (
    <div className="p-8 max-w-4xl">
      {/* Back arrow */}
      <Link href={`/jobs/${job.id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to job
      </Link>

      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit {job.name}</h1>

      {/* Current config (read-only) */}
      <div className="mb-6 opacity-75">
        <ConfigCard type={job.type} config={job.config} />
      </div>

      {/* Quick edit chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filteredChips.map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setChangeDescription(label)}
            className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Change description */}
      <textarea
        value={changeDescription}
        onChange={(e) => setChangeDescription(e.target.value)}
        placeholder="Describe the changes you want to make..."
        className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 mb-4"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {!proposedConfig ? (
        <button
          onClick={handleApplyChanges}
          disabled={!changeDescription.trim() || isApplying}
          className="w-full py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isApplying ? 'Applying changes...' : 'Apply changes'}
        </button>
      ) : (
        <>
          {/* Diff view */}
          <div className="mb-6">
            <DiffView oldConfig={job.config} newConfig={proposedConfig} />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
            <button
              onClick={() => setProposedConfig(null)}
              className="flex-1 py-2.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Change request
            </button>
            <button
              onClick={() => router.push(`/jobs/${job.id}`)}
              className="py-2.5 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Telegram settings (collapsible) */}
      <div className="mt-8 border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setTelegramExpanded(!telegramExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">Telegram settings</span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${telegramExpanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {telegramExpanded && (
          <div className="p-4 space-y-3">
            {telegram?.enabled ? (
              <>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500 w-16">Token:</span>
                  <code className="font-mono text-xs text-gray-600">{maskToken(telegram.bot_token || '')}</code>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500 w-16">Chat ID:</span>
                  <code className="font-mono text-xs text-gray-600">{telegram.chat_id}</code>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">Telegram notifications are not configured for this job.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
