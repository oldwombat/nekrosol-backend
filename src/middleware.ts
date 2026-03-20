import { type NextRequest, NextResponse } from 'next/server'

// Custom game API routes that need explicit CORS headers.
// Payload CMS handles CORS for its own routes ([...slug]/route.ts).
const CUSTOM_API_ROUTES = /^\/api\/(missions|messages|player-actions|player-inventory|player-quests|player-prestige)/

function getAllowedOrigins(): string[] {
  return [
    'http://localhost:8081',
    'http://localhost:3000',
    ...(process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ?? []),
  ]
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!CUSTOM_API_ROUTES.test(pathname)) {
    return NextResponse.next()
  }

  const origin = req.headers.get('origin')
  const allowed = origin && getAllowedOrigins().includes(origin)

  // Respond to CORS preflight
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 })
    if (allowed) {
      res.headers.set('Access-Control-Allow-Origin', origin)
      res.headers.set('Access-Control-Allow-Credentials', 'true')
      res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      res.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With',
      )
      res.headers.set('Access-Control-Max-Age', '86400')
    }
    return res
  }

  const res = NextResponse.next()
  if (allowed) {
    res.headers.set('Access-Control-Allow-Origin', origin)
    res.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  return res
}

export const config = {
  matcher: [
    '/api/missions/:path*',
    '/api/messages/:path*',
    '/api/player-actions/:path*',
    '/api/player-inventory/:path*',
    '/api/player-quests/:path*',
    '/api/player-prestige/:path*',
  ],
}
