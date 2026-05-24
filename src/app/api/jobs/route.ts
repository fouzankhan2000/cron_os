import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createWorkflow } from '@/lib/github'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('cron_jobs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()

  const { name, type, schedule, schedule_human, description, config, telegram } = body

  const jobConfig = { ...config, telegram: telegram || { enabled: false } }

  const { data: job, error } = await supabaseAdmin
    .from('cron_jobs')
    .insert({
      name,
      type,
      schedule,
      schedule_human,
      description,
      config: jobConfig,
      enabled: true,
    })
    .select()
    .single()

  if (error || !job) {
    return NextResponse.json({ error: error?.message || 'Failed to create job' }, { status: 500 })
  }

  // Create GitHub workflow
  try {
    const workflowPath = await createWorkflow({ id: job.id, name: job.name, schedule: job.schedule })
    await supabaseAdmin
      .from('cron_jobs')
      .update({ github_workflow_path: workflowPath })
      .eq('id', job.id)
    job.github_workflow_path = workflowPath
  } catch {
    // Workflow creation failed — job still exists, can retry later
  }

  // Fire-and-forget playbook research for social/storyteller
  if (type === 'social' || type === 'storyteller') {
    const enabledPlatforms: string[] = []
    if (config?.platforms?.twitter?.enabled) enabledPlatforms.push('twitter')
    if (config?.platforms?.linkedin?.enabled) enabledPlatforms.push('linkedin')

    if (enabledPlatforms.length > 0) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/playbook/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          platforms: enabledPlatforms,
          niche: config?.niche || 'indie SaaS, developer tools',
        }),
      }).catch(() => {})
    }
  }

  return NextResponse.json(job)
}
