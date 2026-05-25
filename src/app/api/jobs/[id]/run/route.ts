import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { chatWithSearch } from '@/lib/openai'
import { sendTelegramNotification } from '@/lib/telegram'
import { executeStoryteller } from '@/lib/storyteller'
import { executeSocial } from '@/lib/social'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // ── 1. AUTH CHECK ──────────────────────────────
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRONOS_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobId = params.id
  const startTime = Date.now()

  // ── 2. LOAD JOB ────────────────────────────────
  const { data: job, error: jobError } = await supabaseAdmin
    .from('cron_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // ── 3. CREATE RUN LOG ──────────────────────────
  const { data: run } = await supabaseAdmin
    .from('cron_runs')
    .insert({ job_id: jobId, status: 'running' })
    .select()
    .single()

  const runId = run?.id
  let runStatus: 'success' | 'failed' = 'success'
  let runOutput = ''
  let runError = ''

  try {
    // ── 4. EXECUTE BY TYPE ─────────────────────────

    if (job.type === 'ai') {
      runOutput = await chatWithSearch(
        job.config.prompt,
        'You are a helpful AI assistant running a scheduled task. Execute the following task and return a clear, complete result.'
      )
    }

    else if (job.type === 'http') {
      const { url, method = 'GET', headers = {}, body } = job.config
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body ? JSON.stringify(body) : undefined,
      })
      runOutput = `${res.status} ${res.statusText}\n${await res.text()}`
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }

    else if (job.type === 'code') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { runInNewContext } = require('vm')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const logs: string[] = []
      const sandbox = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console: { log: (...args: any[]) => logs.push(args.join(' ')) },
        fetch,
        process: { env: {} }, // empty env — no secrets in sandbox
      }
      runInNewContext(job.config.code, sandbox, { timeout: 30000 })
      runOutput = logs.join('\n') || '(no output)'
    }

    else if (job.type === 'social') {
      const result = await executeSocial(job, runId)
      runOutput = `Posted to: ${result.platforms.join(', ')}\nHook: ${result.hook}`
    }

    else if (job.type === 'storyteller') {
      const result = await executeStoryteller(job, runId)
      runOutput = `Mode: ${result.mode} | Product: ${result.product || 'none'}\nHook: ${result.hook}`
    }

  } catch (err: unknown) {
    runStatus = 'failed'
    runError = err instanceof Error ? err.message : 'Unknown error'
  }

  // ── 5. UPDATE RUN LOG ──────────────────────────
  await supabaseAdmin
    .from('cron_runs')
    .update({
      status: runStatus,
      output: runOutput || null,
      error: runError || null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId)

  // Update last_run_at on the job
  await supabaseAdmin
    .from('cron_jobs')
    .update({ last_run_at: new Date().toISOString() })
    .eq('id', jobId)

  // ── 6. TELEGRAM NOTIFICATION ───────────────────
  const telegram = job.config?.telegram
  if (telegram?.enabled && telegram?.bot_token && telegram?.chat_id) {
    // Social and storyteller handle their own Telegram inside their executors
    // Only send here for ai, http, code types
    if (!['social', 'storyteller'].includes(job.type)) {
      const notifyOn: string[] = telegram.notify_on || ['success', 'failed']
      if (
        (runStatus === 'success' && notifyOn.includes('success')) ||
        (runStatus === 'failed' && notifyOn.includes('failed'))
      ) {
        await sendTelegramNotification({
          botToken: telegram.bot_token,
          chatId: telegram.chat_id,
          jobName: job.name,
          status: runStatus,
          output: runOutput,
          error: runError,
          durationMs: Date.now() - startTime,
        }).catch(() => {}) // never fail the run because of Telegram
      }
    }
  }

  return NextResponse.json({ success: true, status: runStatus, runId })
}
