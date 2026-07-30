import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase server environment variables')
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function requireAdmin(request: NextRequest): Promise<
  | { supabase: SupabaseClient; actorId: string }
  | { error: NextResponse }
> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const supabase = createAdminClient()
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) {
    return { error: NextResponse.json({ error: 'Invalid session' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role,active')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile?.active || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Admin permission required' }, { status: 403 }) }
  }
  return { supabase, actorId: authData.user.id }
}
