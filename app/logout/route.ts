import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  
  // Sign out the user
  await supabase.auth.signOut()
  
  // Redirect to the login page
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL))
}