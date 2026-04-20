import { NextResponse } from 'next/server'
import { readSubmissions } from '@/lib/submissions'

export async function GET() {
  const submissions = await readSubmissions()
  const pending = submissions.filter((item) => item.status === 'pending')
  return NextResponse.json({
    total: submissions.length,
    pending: pending.length
  })
}
