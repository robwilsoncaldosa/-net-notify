import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from './utils/supabase/middleware'

// List of routes that don't require authentication
// Update the publicRoutes array to include the signup page
const publicRoutes = ['/login', '/auth/callback', '/signup', '/forgot-password', '/reset-password']

export async function middleware(request: NextRequest) {
  // Create a Supabase client configured to use cookies
  const { supabase, response } = await createClient(request)

  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession()

  // Check if the route is public or if the user is authenticated
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // If the route is not public and the user is not authenticated, redirect to login
  if (!isPublicRoute && !session) {
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If the user is authenticated and trying to access login, redirect to dashboard
  if (session && request.nextUrl.pathname === '/login') {
    const redirectUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    // Match all routes except for static files, api routes, and _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}