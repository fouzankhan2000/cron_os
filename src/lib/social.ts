import { chatWithSearch } from './openai'
import { getOrBuildPlaybook, injectPlaybookRules } from './playbook'
import { supabaseAdmin } from './supabase'
import { sendContentToTelegram } from './telegram'
import { CronJob } from './types'

export async function executeSocial(
  job: CronJob,
  runId: string
): Promise<{ platforms: string[]; hook: string }> {
  const config = job.config
  const niche = 'indie SaaS, developer tools'

  // ── 1. Load playbooks for enabled platforms ──────────────────────────
  const twitterRules = config.platforms?.twitter?.enabled
    ? await getOrBuildPlaybook(job.id, 'twitter', niche)
    : null
  const linkedinRules = config.platforms?.linkedin?.enabled
    ? await getOrBuildPlaybook(job.id, 'linkedin', niche)
    : null

  // ── 2. Build generation prompt ───────────────────────────────────────
  const maxTweets = config.platforms?.twitter?.max_tweets || 7
  const format = config.platforms?.twitter?.format || 'thread'

  let systemPrompt = `You are a social media content writer for an indie SaaS founder.
Topic: ${config.topic}
Research focus: ${config.research_instructions || 'Focus on practical insights with real examples.'}
Tone: ${config.tone || 'educational'}

NON-PROMOTIONAL GUARDRAILS (absolute — never break):
1. NEVER open with the product name. First sentence = human story, problem, or observation.
2. NO calls to action.
3. NO adjectives: powerful, seamless, simple, easy, amazing, game-changer.
4. Product appears in second half as context — never as the thesis.
5. Include something that went wrong, surprised you, or you're still unsure about.
6. Write like a real person — not a press release.

After generating, SELF-CHECK each output against all rules above before returning.
If any rule is violated, rewrite that section.

Return ONLY valid JSON — no markdown, no backticks:
{
  "twitter": { "tweets": ["tweet 1 (hook)", "tweet 2", ...], "format": "${format}", "max_tweets": ${maxTweets} },
  "linkedin": { "content": "Full LinkedIn post text with line breaks" }
}

Only generate content for enabled platforms.
${config.platforms?.twitter?.enabled ? `Twitter: enabled (${format}, max ${maxTweets} tweets)` : 'Twitter: disabled'}
${config.platforms?.linkedin?.enabled ? 'LinkedIn: enabled' : 'LinkedIn: disabled'}`

  if (twitterRules) systemPrompt = injectPlaybookRules(systemPrompt, 'twitter', twitterRules)
  if (linkedinRules) systemPrompt = injectPlaybookRules(systemPrompt, 'linkedin', linkedinRules)

  // ── 3. Research + generate ────────────────────────────────────────────
  const raw = await chatWithSearch(
    `Write social media content about: ${config.topic}`,
    systemPrompt,
    2000
  )
  const generated = JSON.parse(raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim())

  // ── 4. Log to social_posts ────────────────────────────────────────────
  const postedPlatforms: string[] = []

  if (config.platforms?.twitter?.enabled && generated.twitter) {
    await supabaseAdmin.from('social_posts').insert({
      job_id: job.id,
      run_id: runId,
      platform: 'twitter',
      content: generated.twitter.tweets.join('\n\n'),
    })
    postedPlatforms.push('Twitter')
  }

  if (config.platforms?.linkedin?.enabled && generated.linkedin) {
    await supabaseAdmin.from('social_posts').insert({
      job_id: job.id,
      run_id: runId,
      platform: 'linkedin',
      content: generated.linkedin.content,
    })
    postedPlatforms.push('LinkedIn')
  }

  // ── 5. Send to Telegram ───────────────────────────────────────────────
  const telegram = config.telegram
  if (telegram?.enabled && telegram?.bot_token && telegram?.chat_id && telegram?.post_links) {
    await sendContentToTelegram({
      botToken: telegram.bot_token,
      chatId: telegram.chat_id,
      mode: 'social',
      topic: config.topic,
      tweets: generated.twitter?.tweets || [],
      linkedinContent: generated.linkedin?.content || '',
    }).catch(console.error)
  }

  return {
    platforms: postedPlatforms,
    hook: generated.twitter?.tweets?.[0] || generated.linkedin?.content?.slice(0, 100) || '',
  }
}
