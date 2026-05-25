import OpenAI from 'openai'

let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

// Standard call wrapper
export async function chatCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  systemPrompt: string,
  maxTokens = 1500
): Promise<string> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  })
  return response.choices[0].message.content || ''
}

// Web search call (uses OpenAI web search tool)
export async function chatWithSearch(
  userMessage: string,
  systemPrompt: string,
  maxTokens = 1500
): Promise<string> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: maxTokens,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_preview' }] as any,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })
  return response.choices[0].message.content || ''
}
