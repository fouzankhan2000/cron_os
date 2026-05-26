import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendTelegramNotification } from '@/lib/telegram'

export async function POST(request: NextRequest) {
  try {
    const { job_id } = await request.json()
    if (!job_id) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 })
    }

    const { data: job, error } = await supabaseAdmin
      .from('cron_jobs')
      .select('*')
      .eq('id', job_id)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const telegram = job.config?.telegram
    if (!telegram?.bot_token || !telegram?.chat_id) {
      return NextResponse.json(
        { error: 'Telegram is not configured for this job' },
        { status: 400 }
      )
    }

    await sendTelegramNotification({
      botToken: telegram.bot_token,
      chatId: telegram.chat_id,
      jobName: job.name,
      status: 'success',
      output: 'This is a test notification from CronOS.',
      durationMs: 0,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to send test message' },
      { status: 500 }
    )
  }
}
