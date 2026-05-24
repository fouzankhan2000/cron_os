'use client'

import Link from 'next/link'
import { useJobs } from '@/hooks/useJobs'
import TypeBadge from '@/components/TypeBadge'
import StatusDot from '@/components/StatusDot'
import EmptyState from '@/components/EmptyState'
import { formatRelativeTime } from '@/lib/utils'
import { CronRun, RunStatus } from '@/lib/types'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function JobsPage() {
  const { jobs, loading } = useJobs()
  const [lastRuns, setLastRuns] = useState<Record<string, CronRun>>({})

  useEffect(() => {
    async function fetchLastRuns() {
      if (jobs.length === 0) return
      const { data } = await supabase
        .from('cron_runs')
        .select('*')
        .in('job_id', jobs.map(j => j.id))
        .order('started_at', { ascending: false })

      if (data) {
        const map: Record<string, CronRun> = {}
        for (const run of data) {
          if (!map[run.job_id]) map[run.job_id] = run
        }
        setLastRuns(map)
      }
    }
    fetchLastRuns()
  }, [jobs])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title="No jobs yet"
          description="Create your first automated job to get started with CronOS."
          actionLabel="Create your first job"
          actionHref="/jobs/new"
        />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Jobs</h1>
        <Link
          href="/jobs/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New job
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Name</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Schedule</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Last Run</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Last Run Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map((job) => {
              const lastRun = lastRuns[job.id]
              return (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/jobs/${job.id}`} className="flex items-center gap-2">
                      <TypeBadge type={job.type} size="sm" />
                      <span className="text-sm font-medium text-gray-900">{job.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{job.schedule_human}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusDot status={lastRun?.status as RunStatus | undefined} />
                      <span className="text-sm text-gray-600">{lastRun?.status || 'Never'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {lastRun ? formatRelativeTime(lastRun.started_at) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
