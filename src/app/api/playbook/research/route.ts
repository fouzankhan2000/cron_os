import { NextRequest, NextResponse } from 'next/server'
import { researchPlaybook, savePlaybook } from '@/lib/playbook'

export async function POST(req: NextRequest) {
  const { jobId, platforms, niche } = await req.json()

  if (!jobId || !platforms?.length) {
    return NextResponse.json({ error: 'jobId and platforms required' }, { status: 400 })
  }

  // Run research for each platform in parallel
  await Promise.allSettled(
    platforms.map((platform: 'twitter' | 'linkedin') =>
      researchPlaybook(jobId, platform, niche || 'indie SaaS, developer tools')
        .then(rules => savePlaybook(jobId, platform, rules))
    )
  )

  return NextResponse.json({ success: true })
}
