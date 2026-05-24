'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useJobRuns } from '@/hooks/useJobRuns'
import { CronJob, RunStatus } from '@/lib/types'
import TypeBadge from '@/components/TypeBadge'
import StatusDot from '@/components/StatusDot'
import ConfigCard from '@/components/ConfigCard'
import ConfirmDialog from '@/components/ConfirmDialog'
import { formatRelativeTime, formatDuration, maskToken } from '@/lib/utils'

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [job, setJob] = useState<CronJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const { runs, loading: runsLoading } = useJobRuns(params.id)

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

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/jobs/${params.id}`, { method: 'DELETE' })
    router.push('/jobs')
  }

  async function handleTestTelegram() {
    setTestingTelegram(true)
    try {
      await fetch(`/api/telegram/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: params.id }),
      })
    } finally {
      setTestingTelegram(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="h-4 bg-gray-100 rounded w-96" />
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
  const lastRun = runs[0]

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TypeBadge type={job.type} size="md" />
            <h1 className="text-2xl font-semibold text-gray-900">{job.name}</h1>
          </div>
          {job.description && <p className="text-sm text-gray-600 mt-1">{job.description}</p>}
        </div>
        <Link
          href={`/jobs/${job.id}/edit`}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Meta card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Schedule</dt>
            <dd className="text-sm text-gray-900">{job.schedule_human}</dd>
            <dd className="text-xs text-gray-400 font-mono mt-0.5">{job.schedule}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Added</dt>
            <dd className="text-sm text-gray-900">{new Date(job.created_at).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Last Run</dt>
            <dd className="flex items-center gap-2 text-sm">
              <StatusDot status={lastRun?.status as RunStatus | undefined} />
              <span className="text-gray-900">{lastRun ? lastRun.status : 'Never'}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</dt>
            <dd className="text-sm">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${job.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {job.enabled ? 'Active' : 'Paused'}
              </span>
            </dd>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="mb-6">
        <ConfigCard type={job.type} config={job.config} />
      </div>

      {/* Telegram */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Telegram</h4>
        {telegram?.enabled ? (
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">Token:</span>
              <code className="font-mono text-xs text-gray-600">{maskToken(telegram.bot_token || '')}</code>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">Chat ID:</span>
              <code className="font-mono text-xs text-gray-600">{telegram.chat_id}</code>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleTestTelegram}
                disabled={testingTelegram}
                className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
              >
                {testingTelegram ? 'Sending...' : 'Send test message'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-3">Telegram notifications are not configured.</p>
            <Link
              href={`/jobs/${job.id}/edit`}
              className="text-sm text-purple-600 hover:underline"
            >
              Set up Telegram
            </Link>
          </div>
        )}
      </div>

      {/* Run History */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-100">
          <h4 className="text-sm font-medium text-gray-700">Run History</h4>
        </div>
        {runsLoading ? (
          <div className="p-4 animate-pulse space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-50 rounded" />)}
          </div>
        ) : runs.length === 0 ? (
          <p className="p-4 text-sm text-gray-400 text-center">No runs yet</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-2">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-2">Started</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-2">Duration</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-2">Output</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.map((run) => (
                <tr
                  key={run.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                >
                  <td className="px-4 py-2.5">
                    <StatusDot status={run.status} />
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">{formatRelativeTime(run.started_at)}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600 font-mono text-xs">
                    {formatDuration(run.started_at, run.completed_at)}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 truncate max-w-xs">
                    {run.error ? (
                      <span className="text-red-500">{run.error.slice(0, 60)}</span>
                    ) : run.output ? (
                      run.output.slice(0, 60)
                    ) : '—'}
                    {expandedRun === run.id && (run.output || run.error) && (
                      <pre className="mt-2 p-3 bg-gray-50 rounded text-xs whitespace-pre-wrap font-mono max-h-48 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        {run.error || run.output}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Danger zone */}
      <div className="border border-red-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-red-800 mb-2">Danger zone</h4>
        <p className="text-sm text-gray-600 mb-3">Once deleted, this job and all its run history will be permanently removed.</p>
        <button
          onClick={() => setShowDelete(true)}
          className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
        >
          Delete this job
        </button>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="Delete job"
        message={`Are you sure you want to delete "${job.name}"? This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}
