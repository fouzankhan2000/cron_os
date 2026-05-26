import { NextResponse } from 'next/server'
import { chatCompletion } from '@/lib/openai'

const SYSTEM_PROMPT = `You are CronOS. Convert a plain English description + clarification answers into a precise cron job config.

Return ONLY valid JSON — no markdown, no backticks:
{
  "name": "3-5 word job name",
  "type": "ai" | "http" | "code" | "social" | "storyteller",
  "schedule": "cron expression",
  "schedule_human": "Plain English e.g. Every day at 9am",
  "description": "One clear sentence of what this job does",
  "config": { ...type-specific fields, no telegram key yet }
}

Config shapes:
- ai:          { "prompt": "Detailed, specific prompt for GPT-4o mini to execute" }
- http:        { "url": "https://...", "method": "GET|POST|PUT|DELETE", "headers": {}, "body": null }
- code:        { "code": "// Full JavaScript\\nconsole.log('hello')", "language": "javascript" }
- social:      { "topic": "...", "research_instructions": "specific focus", "tone": "educational|casual|promotional|storytelling", "platforms": { "twitter": { "enabled": true, "format": "thread|single", "max_tweets": 7 }, "linkedin": { "enabled": true } } }
- storyteller: { "founder_name": "...", "niche": "...", "products": [{ "name": "...", "description": "...", "url": "..." }], "tone_notes": "honest, conversational, never salesy", "platforms": { "twitter": { "enabled": true, "max_tweets": 7 }, "linkedin": { "enabled": true } } }

Common schedules:
- Every 5 min: */5 * * * *
- Hourly: 0 * * * *
- Daily 9am: 0 9 * * *
- Weekdays 9am: 0 9 * * 1-5
- Monday 9am: 0 9 * * 1
- Fri 5pm: 0 17 * * 5
- Sunday midnight: 0 0 * * 0
- Every 5 min minimum (GitHub Actions limit)`

function stripMarkdownFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
}

export async function POST(request: Request) {
  const { description, answers } = await request.json()

  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 })
  }

  let userMessage = description
  if (answers && Object.keys(answers).length > 0) {
    const answerLines = Object.entries(answers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
    userMessage += `\n\nAdditional details from user:\n${answerLines}`
  }

  let raw: string
  try {
    raw = await chatCompletion(
      [{ role: 'user', content: userMessage }],
      SYSTEM_PROMPT
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OpenAI request failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  try {
    const parsed = JSON.parse(stripMarkdownFences(raw))
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to generate config' }, { status: 500 })
  }
}
