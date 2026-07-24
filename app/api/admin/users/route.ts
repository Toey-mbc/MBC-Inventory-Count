import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const AUTH_DOMAIN = 'mbc.internal'
const SHORT_PASSWORD_ALIAS = '1234'
const SHORT_PASSWORD_INTERNAL = 'MBC@1234'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase server environment variables')
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '').replace(/@.*$/, '')
}

function internalPassword(value: string) {
  return value === SHORT_PASSWORD_ALIAS ? SHORT_PASSWORD_INTERNAL : value
}

async function requireAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const supabase = adminClient()
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) return { error: NextResponse.json({ error: 'Invalid session' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,active')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (!profile?.active || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Admin permission required' }, { status: 403 }) }
  }
  return { supabase, actorId: authData.user.id }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error
    const { data, error } = await auth.supabase
      .from('profiles')
      .select('id,email,full_name,role,active,must_change_password,created_at')
      .order('created_at', { ascending: true })
    if (error) throw error
    return NextResponse.json({ users: data ?? [] })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'ไม่สามารถโหลดผู้ใช้งานได้' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error
    const body = await request.json()
    const username = normalizeUsername(String(body.username ?? ''))
    const fullName = String(body.fullName ?? '').trim()
    const role = String(body.role ?? 'counter')
    const password = String(body.password ?? '')
    const validRoles = ['admin', 'warehouse_manager', 'sale_support', 'counter', 'viewer']

    if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้ต้องมี 3-40 ตัว และใช้เฉพาะ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง' }, { status: 400 })
    }
    if (!validRoles.includes(role)) return NextResponse.json({ error: 'Role ไม่ถูกต้อง' }, { status: 400 })
    if (password.length < 4) return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' }, { status: 400 })

    const email = `${username}@${AUTH_DOMAIN}`
    const { data, error } = await auth.supabase.auth.admin.createUser({
      email,
      password: internalPassword(password),
      email_confirm: true,
      user_metadata: { full_name: fullName, role, must_change_password: true },
    })
    if (error) {
      const duplicate = /already|registered|exists/i.test(error.message)
      return NextResponse.json({ error: duplicate ? 'ชื่อผู้ใช้นี้มีอยู่แล้ว' : error.message }, { status: duplicate ? 409 : 400 })
    }

    await auth.supabase.from('audit_logs').insert({
      actor_id: auth.actorId,
      action: 'create_user',
      entity_type: 'profile',
      entity_id: data.user.id,
      details: { username, role },
    })
    return NextResponse.json({ ok: true, id: data.user.id })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'สร้างผู้ใช้งานไม่สำเร็จ' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error
    const body = await request.json()
    const id = String(body.id ?? '')
    if (!id) return NextResponse.json({ error: 'ไม่พบ User ID' }, { status: 400 })

    const update: Record<string, unknown> = {}
    if (typeof body.fullName === 'string') update.full_name = body.fullName.trim()
    if (typeof body.active === 'boolean') update.active = body.active
    if (typeof body.mustChangePassword === 'boolean') update.must_change_password = body.mustChangePassword
    if (typeof body.role === 'string') {
      const validRoles = ['admin', 'warehouse_manager', 'sale_support', 'counter', 'viewer']
      if (!validRoles.includes(body.role)) return NextResponse.json({ error: 'Role ไม่ถูกต้อง' }, { status: 400 })
      update.role = body.role
    }
    update.updated_at = new Date().toISOString()

    const { error: profileError } = await auth.supabase.from('profiles').update(update).eq('id', id)
    if (profileError) throw profileError

    if (typeof body.password === 'string' && body.password) {
      if (body.password.length < 4) return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' }, { status: 400 })
      const { error: passwordError } = await auth.supabase.auth.admin.updateUserById(id, {
        password: internalPassword(body.password),
      })
      if (passwordError) throw passwordError
    }

    await auth.supabase.from('audit_logs').insert({
      actor_id: auth.actorId,
      action: 'update_user',
      entity_type: 'profile',
      entity_id: id,
      details: { role: body.role, active: body.active, password_reset: Boolean(body.password) },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'แก้ไขผู้ใช้งานไม่สำเร็จ' }, { status: 500 })
  }
}
