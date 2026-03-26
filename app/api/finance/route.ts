import { NextResponse } from 'next/server'
import { getFinanceEntries, saveFinanceEntries } from '@/lib/db'

type FinanceEntryInput = {
  id?: string
  type: 'income' | 'expense'
  amount: number
  description?: string
  category?: string
  date?: string
  time?: string
  items?: { product: any; quantity: number }[]
  receivedAmount?: number | null
  changeDue?: number | null
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const date = url.searchParams.get('date')
  const type = url.searchParams.get('type')
  const entries = (await getFinanceEntries()) as any[]
  let data = entries || []
  if (date) data = data.filter(e => e.date === date)
  if (type) data = data.filter(e => e.type === type)
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  try {
    const raw = (await request.json()) as FinanceEntryInput
    const now = new Date()
    const date = raw.date || now.toISOString().split('T')[0]
    const time =
      raw.time ||
      now.toLocaleTimeString('zh-TW', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    const amount = Number(raw.amount) || 0
    const items = Array.isArray(raw.items) ? raw.items : []
    const received =
      typeof raw.receivedAmount === 'number' ? raw.receivedAmount : null
    const changeDue =
      typeof raw.changeDue === 'number'
        ? raw.changeDue
        : received != null
        ? Math.max(0, received - amount)
        : null

    const newEntry = {
      id: raw.id || Math.random().toString(36).substr(2, 9),
      type: raw.type,
      amount,
      description: raw.description || '',
      category: raw.category || null,
      date,
      time,
      items,
      receivedAmount: received,
      changeDue,
      createdAt: now.toISOString(),
    }

    const entries = ((await getFinanceEntries()) as any[]) || []
    entries.unshift(newEntry)
    await saveFinanceEntries(entries)
    return NextResponse.json(newEntry)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create finance entry' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const entries = ((await getFinanceEntries()) as any[]) || []
    const { id } = await request.json()
    const filtered = entries.filter(e => e.id !== id)
    await saveFinanceEntries(filtered)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete finance entry' },
      { status: 500 }
    )
  }
}
