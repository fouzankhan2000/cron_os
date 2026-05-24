'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CronJob } from '@/lib/types'

export function useJobs() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchJobs() {
      const { data, error: fetchError } = await supabase
        .from('cron_jobs')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setJobs(data || [])
      }
      setLoading(false)
    }

    fetchJobs()

    const channel = supabase
      .channel('cron_jobs_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cron_jobs' },
        (payload) => {
          setJobs((prev) => [payload.new as CronJob, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cron_jobs' },
        (payload) => {
          setJobs((prev) =>
            prev.map((job) => (job.id === (payload.new as CronJob).id ? (payload.new as CronJob) : job))
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'cron_jobs' },
        (payload) => {
          setJobs((prev) => prev.filter((job) => job.id !== (payload.old as { id: string }).id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { jobs, loading, error }
}
