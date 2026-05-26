import { NextResponse } from 'next/server'

// Firebase uses popup-based auth — no OAuth callback needed.
// This stub prevents 404s if old links are followed.
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/`)
}
