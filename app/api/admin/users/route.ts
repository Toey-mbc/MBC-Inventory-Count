import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/admin'

const AUTH_DOMAIN = 'mbc.internal'
const SHORT_PASSWORD_ALIAS = '1234'
const SHORT_PASSWORD_INTERNAL = 'MBC@1234'

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '').replace(/@.*$/, '')
}

function internalPassword(value: string) {
  return value === SHORT_PASSWORD_ALIAS ? SHORT_PASSWORD_INTERNAL : value
}

function normalizeAccessMode(value: unknown): 'read' | 'edit' {
  return value === 'edit' ? 'edit' : 'read'
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error
    const { data, error } = await auth.supabase
      .from('profiles')
      .select('id,email,full_name,role,access_mode,active,created_at')
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
    const accessMode = normalizeAccessMode(body.accessMode)
    const password = String(body.password ?? '')

    if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้ต้องมี 3-40 ตัว และใช้เฉพาะ a-z, 0-9, จุด, ขีดกลาง หรือขีดล่าง' }, { status: 400 })
    }
    if (password.length < 4) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' }, { status: 400 })
    }

    const email = `${username}@${AUTH_DOMAIN}`
    const { data, error } = await auth.supabase.auth.admin.createUser({
      email,
      password: internalPassword(password),
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'counter',
        access_mode: accessMode,
        must_change_password: false,
      },
    })
    if (error) {
      const duplicate = /already|registered|exists/i.test(error.message)
      return NextResponse.json({ error: duplicate ? 'ชื่อผู้ใช้นี้มีอยู่แล้ว' : error.message }, { status: duplicate ? 409 : 400 })
    }

    const { error: profileError } = await auth.supabase.from('profiles').update({
      full_name: fullName,
      role: 'counter',
      access_mode: accessMode,
      active: true,
      must_change_password: false,
      updated_at: new Date().toISOString(),
    }).eq('id', data.user.id)
    if (profileError) throw profileError

    await auth.supabase.from('audit_logs').insert({
      actor_id: auth.actorId,
      action: 'create_user',
      entity_type: 'profile',
      entity_id: data.user.id,
      details: { username, access_mode: accessMode },
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

    const { data: target, error: targetError } = await auth.supabase
      .from('profiles')
      .select('role,email')
      .eq('id', id)
      .maybeSingle()
    if (targetError) throw targetError
    if (!target) return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 })

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.fullName === 'string') update.full_name = body.fullName.trim()
    if (typeof body.active === 'boolean') {
      if (target.role === 'admin' && id === auth.actorId && body.active === false) {
        return NextResponse.json({ error: 'ไม่สามารถระงับบัญชี Admin ที่กำลังใช้งานอยู่' }, { status: 400 })
      }
      update.active = body.active
    }
    if (typeof body.accessMode === 'string' && target.role !== 'admin') {
      update.access_mode = normalizeAccessMode(body.accessMode)
      update.role = 'counter'
    }

    const { error: profileError } = await auth.supabase.from('profiles').update(update).eq('id', id)
    if (profileError) throw profileError

    if (typeof body.password === 'string' && body.password) {
      if (body.password.length < 4) {
        return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' }, { status: 400 })
      }
      const { error: passwordError } = await auth.supabase.auth.admin.updateUserById(id, {
        password: internalPassword(body.password),
      })
      if (passwordError) throw passwordError
      const { error: clearPasswordFlagError } = await auth.supabase
        .from('profiles')
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (clearPasswordFlagError) throw clearPasswordFlagError
    }

    await auth.supabase.from('audit_logs').insert({
      actor_id: auth.actorId,
      action: 'update_user',
      entity_type: 'profile',
      entity_id: id,
      details: {
        access_mode: body.accessMode,
        active: body.active,
        password_reset: Boolean(body.password),
      },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'แก้ไขผู้ใช้งานไม่สำเร็จ' }, { status: 500 })
  }
}
