import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isAdminAccount, normalizeRole } from '@/lib/permissions'

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
    .select('role,active,email')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile?.active || !isAdminAccount(profile.role, profile.email || authData.user.email)) {
    return { error: NextResponse.json({ error: 'Admin permission required' }, { status: 403 }) }
  }

  // Repair older deployments where the reserved admin account was created but
  // its profile role remained viewer/counter. This update runs with the service
  // role and permanently restores role-based authorization.
  if (normalizeRole(profile.role) !== 'admin') {
    const { error: promoteError } = await supabase
      .from('profiles')
      .update({ role: 'admin', active: true, updated_at: new Date().toISOString() })
      .eq('id', authData.user.id)
    if (promoteError) throw promoteError
    await supabase.auth.admin.updateUserById(authData.user.id, {
      user_metadata: { ...authData.user.user_metadata, role: 'admin' },
    })
  }

  return { supabase, actorId: authData.user.id }
}
