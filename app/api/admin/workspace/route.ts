import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/server/admin'

type WorkspaceState = Record<string, unknown>

type WorkspaceEvent = {
  id: string
  roundId?: string
  [key: string]: unknown
}

function asRecord(value: unknown): WorkspaceState {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? structuredClone(value as WorkspaceState)
    : {}
}

function clearWorkspaceState(input: unknown, scope: 'counts' | 'transactions' | 'factory', actorId: string) {
  const state = asRecord(input)
  const meta = asRecord(state.meta)
  meta.savedAt = new Date().toISOString()
  meta.serverRevision = Number(meta.serverRevision ?? 0) + 1
  state.meta = meta

  if (scope === 'counts') {
    state.rounds = []
    state.unknowns = []
    state.adjustments = []
    state.scanEvents = []
    state.scanContext = {
      ...(asRecord(state.scanContext)),
      roundId: '',
    }
  }

  if (scope === 'transactions') {
    state.rounds = []
    state.unknowns = []
    state.adjustments = []
    state.transfers = []
    state.scanEvents = []
    state.stockBalances = {}
    state.scanContext = {
      ...(asRecord(state.scanContext)),
      roundId: '',
      warehouseId: '',
      locationId: '',
    }
  }

  if (scope === 'factory') {
    state.brands = []
    state.categories = []
    state.warehouses = []
    state.locations = []
    state.products = []
    state.stockBalances = {}
    state.rounds = []
    state.unknowns = []
    state.adjustments = []
    state.transfers = []
    state.scanEvents = []
    state.scanContext = {
      roundId: '', warehouseId: '', locationId: '', conditionId: 'COND-NORMAL', counterId: '', packQty: 12,
    }
  }

  const audit = Array.isArray(state.audit) ? state.audit : []
  audit.unshift({
    id: `AUD-${crypto.randomUUID()}`,
    time: new Date().toISOString(),
    userId: actorId,
    action: `ADMIN_CLEAR_${scope.toUpperCase()}`,
    detail: scope === 'counts' ? 'ล้างข้อมูลตรวจนับ' : scope === 'transactions' ? 'ล้างข้อมูลธุรกรรม' : 'ล้างข้อมูลทั้งหมด',
    entityType: 'system',
    entityId: 'main',
    deviceId: 'server',
    sessionId: 'admin-api',
  })
  state.audit = audit.slice(0, 2000)

  return state
}

async function replaceWorkspace(
  supabase: SupabaseClient,
  actorId: string,
  state: WorkspaceState,
  events: WorkspaceEvent[],
  auditAction: string,
) {
  const stateMeta = asRecord(state.meta)
  stateMeta.scanEventsEpoch = crypto.randomUUID()
  stateMeta.savedAt = new Date().toISOString()
  state.meta = stateMeta

  const { data: current, error: currentError } = await supabase
    .from('workspace_states')
    .select('revision')
    .eq('id', 'main')
    .maybeSingle()
  if (currentError) throw currentError
  const revision = Number(current?.revision ?? 0) + 1

  const { error: stateError } = await supabase.from('workspace_states').upsert({
    id: 'main',
    state,
    revision,
    updated_at: new Date().toISOString(),
    updated_by: actorId,
  }, { onConflict: 'id' })
  if (stateError) throw stateError

  const { error: deleteEventsError } = await supabase
    .from('workspace_scan_events')
    .delete()
    .neq('id', '')
  if (deleteEventsError) throw deleteEventsError

  if (events.length) {
    const rows = events
      .filter(event => event?.id && event?.roundId)
      .map(event => ({
        id: event.id,
        round_id: String(event.roundId),
        event,
        user_id: actorId,
      }))
    for (let index = 0; index < rows.length; index += 500) {
      const { error } = await supabase
        .from('workspace_scan_events')
        .upsert(rows.slice(index, index + 500), { onConflict: 'id', ignoreDuplicates: true })
      if (error) throw error
    }
  }

  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: auditAction,
    entity_type: 'workspace',
    entity_id: 'main',
    details: { event_count: events.length },
  })

  return { state, revision, updatedAt: new Date().toISOString(), clearEvents: true }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error
    const body = await request.json()

    if (body.action === 'restore') {
      const state = asRecord(body.state)
      const events = Array.isArray(body.events) ? body.events as WorkspaceEvent[] : []
      const result = await replaceWorkspace(auth.supabase, auth.actorId, state, events, 'restore_workspace')
      return NextResponse.json(result)
    }

    if (body.action === 'clear') {
      const scope = body.scope as 'counts' | 'transactions' | 'factory'
      const required: Record<typeof scope, string> = {
        counts: 'CLEAR COUNTS',
        transactions: 'CLEAR TRANSACTIONS',
        factory: 'FACTORY RESET',
      }
      if (!required[scope] || String(body.confirmation ?? '').toUpperCase() !== required[scope]) {
        return NextResponse.json({ error: 'ข้อความยืนยันไม่ถูกต้อง' }, { status: 400 })
      }

      const { data: row, error: rowError } = await auth.supabase
        .from('workspace_states')
        .select('state')
        .eq('id', 'main')
        .maybeSingle()
      if (rowError) throw rowError

      const nextState = clearWorkspaceState(row?.state, scope, auth.actorId)
      const result = await replaceWorkspace(
        auth.supabase,
        auth.actorId,
        nextState,
        [],
        `admin_clear_${scope}`,
      )

      // Keep normalized tables consistent with the shared workspace state.
      await auth.supabase.from('count_rounds').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (scope === 'factory') {
        await auth.supabase.from('product_barcodes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await auth.supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await auth.supabase.from('locations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await auth.supabase.from('warehouses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      }

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : 'จัดการข้อมูลไม่สำเร็จ'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
