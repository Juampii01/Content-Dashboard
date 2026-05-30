import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Edge-safe proxy (Next 16, formerly "middleware") — only handles session
// cookie refresh + unauth redirect. Heavy work (Profile upsert, PENDING gate,
// activeClient cookie) is done in app/layout.tsx which runs on Node.js and
// can use Prisma.

const PUBLIC_PATHS = ['/login', '/pending-approval', '/auth/reset-password']
// `/api/auth` is excluded by the `matcher` below (never runs through this
// proxy). No public `/api/*` prefixes currently — the stale `/api/debug`
// was removed when the debug route was deleted.

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  // Forward pathname to server components (Next.js drops it from downstream headers).
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  let authNetworkError = false
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    console.error('[proxy] supabase.auth.getUser() failed — failing open:', err)
    authNetworkError = true
  }

  // API routes self-protect via requireActiveClient() / requireUserId() and
  // return JSON 401/403. Never redirect them to /login (frontend would receive
  // HTML instead of JSON and silently swallow the error).
  // When a network error prevents us from confirming auth state, fail open
  // (pass through) rather than redirecting valid sessions to /login.
  if (!authNetworkError && !user && !isPublicPath(pathname) && !pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.mp4|.*\\.webm|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.ico).*)'],
}
