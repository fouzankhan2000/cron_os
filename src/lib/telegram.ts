export async function sendTelegramNotification({
  botToken,
  chatId,
  jobName,
  status,
  output,
  error,
  durationMs,
}: {
  botToken: string
  chatId: string
  jobName: string
  status: 'success' | 'failed'
  output?: string
  error?: string
  durationMs: number
}) {
  const emoji = status === 'success' ? '✅' : '❌'
  const duration = (durationMs / 1000).toFixed(1)
  let text = `${emoji} *${jobName}* — ${status}\n⏱ ${duration}s`

  if (status === 'success' && output) {
    const trimmed = output.length > 3000 ? output.slice(0, 3000) + '…' : output
    text += `\n\n${trimmed}`
  }

  if (status === 'failed' && error) {
    text += `\n\n⚠️ ${error}`
  }

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  })
}

export function buildTwitterIntentUrl(tweetText: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`
}

export function buildLinkedInShareUrl(text: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?text=${encodeURIComponent(text)}`
}

export async function sendContentToTelegram({
  botToken,
  chatId,
  mode,
  modeEmoji,
  topic,
  product,
  hook,
  tweets,
  linkedinContent,
}: {
  botToken: string
  chatId: string
  mode: string
  modeEmoji?: string
  topic?: string
  product?: string | null
  hook?: string
  tweets: string[]
  linkedinContent: string
}) {
  const emoji = modeEmoji || '📝'
  const label = topic || product || mode
  let text = `${emoji} *${label}* — ${mode}\n`

  if (hook) {
    text += `\n💡 Hook: _${hook}_\n`
  }

  // Twitter content
  if (tweets.length > 0) {
    text += `\n🐦 *Twitter Thread* (${tweets.length} tweets):\n`
    tweets.forEach((tweet, i) => {
      text += `\n${i + 1}. ${tweet}`
    })
  }

  // LinkedIn content
  if (linkedinContent) {
    const trimmed = linkedinContent.length > 1500 ? linkedinContent.slice(0, 1500) + '…' : linkedinContent
    text += `\n\n💼 *LinkedIn*:\n${trimmed}`
  }

  // Build inline keyboard with share links
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buttons: any[][] = []
  if (tweets.length > 0) {
    const firstTweet = tweets[0]
    buttons.push([{ text: '🐦 Post to Twitter', url: buildTwitterIntentUrl(firstTweet) }])
  }
  if (linkedinContent) {
    buttons.push([{ text: '💼 Post to LinkedIn', url: buildLinkedInShareUrl(linkedinContent) }])
  }

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
    }),
  })
}
