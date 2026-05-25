import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  // Verify job exists
  const { data: job, error: fetchError } = await supabaseAdmin
    .from('cron_jobs')
    .select('id')
    .eq('id', params.id)
    .single()

  if (fetchError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Insert run record
  const { data: run, error: runError } = await supabaseAdmin
    .from('cron_runs')
    .insert({ job_id: params.id, status: 'running' })
    .select()
    .single()

  if (runError || !run) {
    return NextResponse.json({ error: 'Failed to create run' }, { status: 500 })
  }

  // Fire-and-forget: trigger the actual job execution
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/${params.id}/run`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CRONOS_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ run_id: run.id }),
  }).catch(() => {})

  return NextResponse.json({ success: true, runId: run.id })
}
