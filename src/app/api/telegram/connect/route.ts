import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?limit=10&offset=-10`
    )
    const data = await res.json()

    if (!data.ok) {
      return NextResponse.json(
        { error: 'Invalid bot token or Telegram API error' },
        { status: 400 }
      )
    }

    // Find the most recent message with a chat ID
    for (let i = data.result.length - 1; i >= 0; i--) {
      const update = data.result[i]
      const chat = update.message?.chat || update.my_chat_member?.chat
      if (chat?.id) {
        return NextResponse.json({ chat_id: String(chat.id) })
      }
    }

    return NextResponse.json(
      { error: 'No messages found. Send a message to your bot first, then try again.' },
      { status: 404 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Failed to connect to Telegram API' },
      { status: 500 }
    )
  }
}
