import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server/admin'
import { accessModeFromRole, normalizeAccessMode, roleFromAccessMode } from '@/lib/permissions'

type ProfileListRow = {
  id: string
  email: string
  full_name: string
  role: string
  active: boolean
  created_at: string
}

const AUTH_DOMAIN = 'mbc.internal'
const SHORT_PASSWORD_ALIAS = '1234'
const SHORT_PASSWORD_INTERNAL = 'MBC@1234'

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '').replace(/@.*$/, '')
}

function internalPassword(value: string) {
  return value === SHORT_PASSWORD_ALIAS ? SHORT_PASSWORD_INTERNAL : value
}

function apiError(error: unknown, fallback: string) {
  console.error(error)
  return NextResponse.json({ error: error instanceof Error ? error.message : fallback }, { status: 500 })
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error
    const { data, error } = await auth.supabase
      .from('profiles')
      .select('id,email,full_name,role,active,created_at')
      .order('created_at', { ascending: true })
    if (error) throw error

    const users = ((data ?? []) as ProfileListRow[]).map(row => ({
      ...row,
      access_mode: accessModeFromRole(row.role),
    }))
    return NextResponse.json({ users })
  } catch (error) {
    return apiError(error, 'ไม่สามารถโหลดผู้ใช้งานได้')
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
    const role = roleFromAccessMode(accessMode)
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
        role,
        must_change_password: false,
      },
    })
    if (error) {
      const duplicate = /already|registered|exists/i.test(error.message)
      return NextResponse.json({ error: duplicate ? 'ชื่อผู้ใช้นี้มีอยู่แล้ว' : error.message }, { status: duplicate ? 409 : 400 })
    }

    const { error: profileError } = await auth.supabase.from('profiles').update({
      full_name: fullName,
      role,
      active: true,
      must_change_password: false,
      updated_at: new Date().toISOString(),
    }).eq('id', data.user.id)
    if (profileError) {
      await auth.supabase.auth.admin.deleteUser(data.user.id)
      throw profileError
    }

    await auth.supabase.from('audit_logs').insert({
      actor_id: auth.actorId,
      action: 'create_user',
      entity_type: 'profile',
      entity_id: data.user.id,
      details: { username, access_mode: accessMode, role },
    })
    return NextResponse.json({ ok: true, id: data.user.id })
  } catch (error) {
    return apiError(error, 'สร้างผู้ใช้งานไม่สำเร็จ')
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
      .select('role,email,full_name,active')
      .eq('id', id)
      .maybeSingle()
    if (targetError) throw targetError
    if (!target) return NextResponse.json({ error: 'ไม่พบผู้ใช้งาน' }, { status: 404 })

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const metadata: Record<string, unknown> = {}

    if (typeof body.fullName === 'string') {
      const fullName = body.fullName.trim()
      update.full_name = fullName
      metadata.full_name = fullName
    }

    if (typeof body.active === 'boolean') {
      if (target.role === 'admin' && body.active === false) {
        return NextResponse.json({ error: 'ไม่สามารถระงับบัญชีผู้ดูแลระบบ' }, { status: 400 })
      }
      update.active = body.active
    }

    let accessMode: 'read' | 'edit' | undefined
    if (typeof body.accessMode === 'string') {
      if (target.role === 'admin') {
        return NextResponse.json({ error: 'สิทธิ์ Admin ไม่สามารถเปลี่ยนเป็นอ่านหรือแก้ไขจากหน้านี้' }, { status: 400 })
      }
      accessMode = normalizeAccessMode(body.accessMode)
      const role = roleFromAccessMode(accessMode)
      update.role = role
      metadata.role = role
    }

    const { error: profileError } = await auth.supabase.from('profiles').update(update).eq('id', id)
    if (profileError) throw profileError

    if (Object.keys(metadata).length) {
      const { error: metadataError } = await auth.supabase.auth.admin.updateUserById(id, { user_metadata: metadata })
      if (metadataError) throw metadataError
    }

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
        access_mode: accessMode,
        active: body.active,
        full_name_changed: typeof body.fullName === 'string',
        password_reset: Boolean(body.password),
      },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error, 'แก้ไขผู้ใช้งานไม่สำเร็จ')
  }
}
