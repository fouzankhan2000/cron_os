import { NextResponse } from 'next/server'
import { chatCompletion } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase'

const SYSTEM_PROMPT = `You are CronOS. Apply the user's requested changes to the existing cron job config.
Only change what was asked. Keep everything else exactly as it was.
Return ONLY valid JSON with the complete updated job fields — same shape as the generate endpoint.`

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { change_description } = await request.json()

  if (!change_description?.trim()) {
    return NextResponse.json({ error: 'Change description is required' }, { status: 400 })
  }

  const { data: currentJob, error: fetchError } = await supabaseAdmin
    .from('cron_jobs')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchError || !currentJob) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const userMessage = `Current job:\n${JSON.stringify(currentJob, null, 2)}\n\nUser wants to change: ${change_description}`

  const raw = await chatCompletion(
    [{ role: 'user', content: userMessage }],
    SYSTEM_PROMPT
  )

  try {
    const parsed = JSON.parse(raw)
    return NextResponse.json({ config: parsed })
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
