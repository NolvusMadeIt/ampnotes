import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ ok: true, service: 'amp-marketplace', time: new Date().toISOString() })
}
