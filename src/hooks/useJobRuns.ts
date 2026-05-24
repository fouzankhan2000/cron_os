'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CronRun } from '@/lib/types'

export function useJobRuns(jobId: string) {
  const [runs, setRuns] = useState<CronRun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRuns() {
      const { data } = await supabase
        .from('cron_runs')
        .select('*')
        .eq('job_id', jobId)
        .order('started_at', { ascending: false })
        .limit(20)

      setRuns(data || [])
      setLoading(false)
    }

    fetchRuns()

    const channel = supabase
      .channel(`cron_runs_${jobId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cron_runs', filter: `job_id=eq.${jobId}` },
        (payload) => {
          setRuns((prev) => [payload.new as CronRun, ...prev].slice(0, 20))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cron_runs', filter: `job_id=eq.${jobId}` },
        (payload) => {
          setRuns((prev) =>
            prev.map((run) => (run.id === (payload.new as CronRun).id ? (payload.new as CronRun) : run))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jobId])

  return { runs, loading }
}
