import { supabaseAdmin } from './supabase'
import { chatWithSearch } from './openai'
import { PlatformPlaybook } from './types'

const PLAYBOOK_EXPIRY_DAYS = 30

// ── RESEARCH ─────────────────────────────────────────────────────────
export async function researchPlaybook(
  jobId: string,
  platform: 'twitter' | 'linkedin',
  niche: string
): Promise<PlatformPlaybook['rules']> {

  const platformName = platform === 'twitter' ? 'Twitter/X' : 'LinkedIn'

  const rules = await chatWithSearch(
    `Research current best practices for posting on ${platformName} in ${niche} niche in 2026.
     Search for: "${platformName} algorithm best practices 2026 indie SaaS founders"
     Also search: "${platformName} what to avoid shadowban engagement 2026"`,
    `You are a social media strategist specializing in ${niche}.
     Research current ${platformName} best practices for indie founders and return ONLY valid JSON — no markdown, no backticks:
     {
       "dos": ["specific actionable do #1", "specific actionable do #2", ...],
       "donts": ["specific thing to avoid #1", "specific thing to avoid #2", ...],
       "best_length": "specific recommendation e.g. 5-7 tweets / 150-200 words",
       "best_times": "specific times e.g. Tue-Thu 8-10am IST",
       "shadowban_risks": ["risk #1", "risk #2"],
       "algorithm_notes": "one paragraph on what the algorithm currently rewards",
       "niche_specific": "one paragraph on what works specifically for indie SaaS / developer tool founders"
     }
     Be specific and current. Include things that changed recently. No generic advice.`,
    1500
  )

  // Strip markdown code fences if present
  const cleaned = rules.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()
  return JSON.parse(cleaned)
}

// ── SAVE ──────────────────────────────────────────────────────────────
export async function savePlaybook(
  jobId: string,
  platform: string,
  rules: PlatformPlaybook['rules']
) {
  await supabaseAdmin
    .from('platform_playbooks')
    .upsert({
      job_id: jobId,
      platform,
      rules,
      researched_at: new Date().toISOString(),
    }, { onConflict: 'job_id,platform' })
}

// ── LOAD ──────────────────────────────────────────────────────────────
export async function loadPlaybook(
  jobId: string,
  platform: string
): Promise<PlatformPlaybook | null> {
  const { data } = await supabaseAdmin
    .from('platform_playbooks')
    .select('*')
    .eq('job_id', jobId)
    .eq('platform', platform)
    .single()
  return data || null
}

// ── STALE CHECK ───────────────────────────────────────────────────────
export function isPlaybookStale(playbook: PlatformPlaybook): boolean {
  const age = Date.now() - new Date(playbook.researched_at).getTime()
  return age > PLAYBOOK_EXPIRY_DAYS * 24 * 60 * 60 * 1000
}

// ── INJECT INTO PROMPT ────────────────────────────────────────────────
export function injectPlaybookRules(
  basePrompt: string,
  platform: string,
  rules: PlatformPlaybook['rules']
): string {
  return `${basePrompt}

PLATFORM RULES FOR ${platform.toUpperCase()} (researched best practices — follow strictly):

DO:
${rules.dos.map(d => `- ${d}`).join('\n')}

DON'T:
${rules.donts.map(d => `- ${d}`).join('\n')}

BEST LENGTH: ${rules.best_length}
BEST POSTING TIMES: ${rules.best_times}
SHADOWBAN RISKS (avoid these): ${rules.shadowban_risks.join(', ')}
ALGORITHM NOTES: ${rules.algorithm_notes}
NICHE SPECIFIC: ${rules.niche_specific}

SELF-CHECK INSTRUCTION:
After generating content, verify it against every rule above.
If any DON'T is violated, rewrite that part before returning.
If the first word is the product name, rewrite the opening.
If any banned adjective appears (powerful, seamless, simple, easy, amazing, game-changer), replace it with a specific fact or story.`
}

// ── GET OR BUILD PLAYBOOK ─────────────────────────────────────────────
export async function getOrBuildPlaybook(
  jobId: string,
  platform: 'twitter' | 'linkedin',
  niche: string
): Promise<PlatformPlaybook['rules'] | null> {
  try {
    const existing = await loadPlaybook(jobId, platform)

    if (existing) {
      // Trigger async refresh if stale (don't await — use current playbook now)
      if (isPlaybookStale(existing)) {
        researchPlaybook(jobId, platform, niche)
          .then(rules => savePlaybook(jobId, platform, rules))
          .catch(console.error)
      }
      return existing.rules
    }

    // No playbook yet — build it now (await — needed for first run)
    const rules = await researchPlaybook(jobId, platform, niche)
    await savePlaybook(jobId, platform, rules)
    return rules

  } catch (err) {
    console.error('Playbook error:', err)
    return null // fail gracefully — post without playbook rather than not posting
  }
}
