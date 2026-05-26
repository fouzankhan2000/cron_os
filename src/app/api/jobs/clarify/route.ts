import { NextResponse } from 'next/server'
import { chatCompletion } from '@/lib/openai'

const SYSTEM_PROMPT = `You are CronOS. A user described a cron job they want to create.
Identify what key details are missing before generating the config.

Return ONLY valid JSON — no markdown, no backticks:
{
  "needs_clarification": true or false,
  "detected_type": "ai" | "http" | "code" | "social" | "storyteller",
  "questions": [
    {
      "id": "unique_snake_case_id",
      "question": "Short direct question (max 10 words)",
      "type": "select" or "text",
      "options": ["Option A", "Option B", "Option C"]
    }
  ]
}

Rules:
- Max 3 questions. Only ask what genuinely changes output quality.
- Prefer "select" with 2-4 options. Use "text" only for open-ended specifics (URL, email).
- If description is already specific enough, return needs_clarification: false.
- For social/storyteller: ask tone if missing, format (thread vs single) if missing, time if missing.
- For AI: ask where output goes (email/Telegram/just log) if not mentioned.
- For HTTP: ask for the URL if not given.
- For code: ask what service/data it connects to if unclear.
- Never ask for a cron expression — infer a sensible one.

Type detection rules:
- ai = summarise, research, digest, monitor, write, email content
- http = ping, webhook, health check, trigger a URL
- code = database cleanup, calculations, scripts, data processing
- social = post on Twitter/X or LinkedIn (one-off topic)
- storyteller = rotating build-in-public content about products`

function stripMarkdownFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
}

export async function POST(request: Request) {
  const { description } = await request.json()

  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 })
  }

  let raw: string
  try {
    raw = await chatCompletion(
      [{ role: 'user', content: description }],
      SYSTEM_PROMPT
    )
  } catch {
    return NextResponse.json({ needs_clarification: false, questions: [] })
  }

  try {
    const parsed = JSON.parse(stripMarkdownFences(raw))
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ needs_clarification: false, questions: [] })
  }
}
