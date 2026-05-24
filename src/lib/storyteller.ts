import { chatWithSearch } from './openai'
import { getOrBuildPlaybook, injectPlaybookRules } from './playbook'
import { supabaseAdmin } from './supabase'
import { sendContentToTelegram } from './telegram'
import { CronJob, Product } from './types'

const MODES = ['progress', 'feature', 'discussion', 'behind_scenes', 'numbers'] as const
type Mode = typeof MODES[number]

const MODE_EMOJI: Record<Mode, string> = {
  progress: '🔄', feature: '✨', discussion: '💬', behind_scenes: '🪞', numbers: '📊'
}

// ── ROTATION ────────────────────────────────────────────────────────────
function pickMode(state: { last_mode?: string; modes_used?: string[] }): Mode {
  const lastMode = state.last_mode
  const used = state.modes_used || []

  // Find least recently used mode, weighted: discussion appears every ~3rd
  const candidates = MODES.filter(m => m !== lastMode)
  const unused = candidates.filter(m => !used.includes(m))
  const pool = unused.length > 0 ? unused : candidates

  // Weight discussion slightly higher if not used recently
  const weighted = pool.flatMap(m => m === 'discussion' ? [m, m] : [m])
  return weighted[Math.floor(Math.random() * weighted.length)] as Mode
}

function pickProduct(products: Product[], lastProduct?: string): Product {
  const candidates = products.filter(p => p.name !== lastProduct)
  return candidates[0] || products[0]
}

function getModeInstructions(mode: Mode, product: Product | null, niche: string): string {
  const instructions: Record<Mode, string> = {
    progress: `Write about something shipped, fixed, broken, or learned this week about ${product?.name}. Be specific. Include what went wrong before it worked. The product is context — not the hero.`,
    feature: `Tell the story of ONE feature in ${product?.name} through a real user problem. Start with the problem or user conversation. The feature is the resolution — never the opening.`,
    discussion: `Share a genuine opinion or hot take about ${niche}. NO product mention at all. Just a founder thinking out loud. Include "I could be wrong" energy.`,
    behind_scenes: `Share a real moment of doubt, a decision you almost got wrong, or the reason behind a product choice in ${product?.name}. Honest and a little vulnerable.`,
    numbers: `Share a real metric about ${product?.name} — users, revenue, signups, churn. Include a win AND something that didn't work. Real numbers with real context.`,
  }
  return instructions[mode]
}

// ── MAIN EXECUTOR ────────────────────────────────────────────────────────
export async function executeStoryteller(
  job: CronJob,
  runId: string
): Promise<{ mode: string; product: string | null; hook: string }> {
  const config = job.config
  const niche = config.niche || 'indie SaaS, developer tools'

  // ── 1. Load state ────────────────────────────────────────────────────
  const { data: state } = await supabaseAdmin
    .from('storyteller_state')
    .select('*')
    .eq('job_id', job.id)
    .single()

  // ── 2. Pick mode + product ────────────────────────────────────────────
  const mode = pickMode(state || {})
  const product = mode === 'discussion' ? null : pickProduct(config.products || [], state?.last_product)

  // ── 3. Load last 3 hooks to avoid repetition ──────────────────────────
  const { data: history } = await supabaseAdmin
    .from('storyteller_history')
    .select('hook')
    .eq('job_id', job.id)
    .order('posted_at', { ascending: false })
    .limit(3)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentHooks = (history || []).map((h: any) => h.hook).filter(Boolean)

  // ── 4. Load playbooks ─────────────────────────────────────────────────
  const twitterRules = config.platforms?.twitter?.enabled
    ? await getOrBuildPlaybook(job.id, 'twitter', niche)
    : null
  const linkedinRules = config.platforms?.linkedin?.enabled
    ? await getOrBuildPlaybook(job.id, 'linkedin', niche)
    : null

  // ── 5. Build prompt ───────────────────────────────────────────────────
  let systemPrompt = `You are writing social media posts for ${config.founder_name}, an indie SaaS founder.

NICHE: ${niche}
${product ? `TODAY'S PRODUCT: ${product.name} — ${product.description}` : 'NO PRODUCT TODAY — pure discussion only'}

MODE: ${mode}
${getModeInstructions(mode, product, niche)}

RECENT POST HOOKS (do not repeat these angles):
${recentHooks.map((h: string, i: number) => `${i + 1}. ${h}`).join('\n') || 'None yet'}

TONE: ${config.tone_notes || 'honest, conversational, never salesy'}

NON-PROMOTIONAL GUARDRAILS (absolute):
1. NEVER open with the product name
2. NO calls to action (except in 'numbers' mode, last line only)
3. NO adjectives: powerful, seamless, simple, easy, amazing, game-changer
4. Product appears in second half as context — never as the thesis
5. Discussion mode: mention NO product at all
6. Include failure, doubt, or surprise
7. Write like a real person — not a press release

SELF-CHECK: After generating, verify every rule above. Rewrite any violations before returning.

Return ONLY valid JSON — no markdown, no backticks:
{
  "hook": "Single strongest opening sentence (for tracking)",
  "twitter": { "tweets": ["tweet 1", "tweet 2", ...] },
  "linkedin": { "content": "Full LinkedIn post text with line breaks" }
}`

  if (twitterRules) systemPrompt = injectPlaybookRules(systemPrompt, 'twitter', twitterRules)
  if (linkedinRules) systemPrompt = injectPlaybookRules(systemPrompt, 'linkedin', linkedinRules)

  // ── 6. Research + generate ────────────────────────────────────────────
  const raw = await chatWithSearch(
    `Write a ${mode} post for a ${niche} founder${product ? ` about ${product.name}` : ''}. Research a current relevant hook first.`,
    systemPrompt,
    2000
  )
  const generated = JSON.parse(raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim())

  // ── 7. Save history + update state ────────────────────────────────────
  await supabaseAdmin.from('storyteller_history').insert({
    job_id: job.id,
    run_id: runId,
    mode,
    product_featured: product?.name || null,
    hook: generated.hook,
    twitter_content: generated.twitter,
    linkedin_content: generated.linkedin?.content,
  })

  const newModesUsed = [...(state?.modes_used || []), mode].slice(-10)
  await supabaseAdmin.from('storyteller_state').upsert({
    job_id: job.id,
    last_mode: mode,
    last_product: product?.name || state?.last_product,
    modes_used: newModesUsed,
    posts_count: (state?.posts_count || 0) + 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'job_id' })

  // ── 8. Send to Telegram ────────────────────────────────────────────────
  const telegram = config.telegram
  if (telegram?.enabled && telegram?.bot_token && telegram?.chat_id) {
    await sendContentToTelegram({
      botToken: telegram.bot_token,
      chatId: telegram.chat_id,
      mode,
      modeEmoji: MODE_EMOJI[mode],
      product: product?.name || null,
      hook: generated.hook,
      tweets: generated.twitter?.tweets || [],
      linkedinContent: generated.linkedin?.content || '',
    }).catch(console.error)
  }

  return { mode, product: product?.name || null, hook: generated.hook }
}
