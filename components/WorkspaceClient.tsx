'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { accessModeFromRole } from '@/lib/permissions'

type WorkspaceStateRow = {
  id: string
  state: Record<string, unknown>
  revision: number
  updated_at: string
}

type ProfileRow = {
  id: string
  email: string
  full_name: string
  role: string
  active: boolean
}

type WorkspaceEvent = {
  id: string
  roundId?: string
  [key: string]: unknown
}

type BridgeMessage = {
  type?: string
  state?: Record<string, unknown>
  events?: WorkspaceEvent[]
  event?: WorkspaceEvent | null
  action?: string
  baseRevision?: number
  scope?: 'counts' | 'transactions' | 'factory'
  confirmation?: string
  path?: string
}

const WORKSPACE_ID = 'main'
const EVENT_PAGE_SIZE = 1000

function errorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error && error.message
    ? error.message
    : typeof error === 'object' && error && 'message' in error
      ? String(error.message)
      : fallback

  if (/workspace_states|workspace_scan_events|save_workspace_state/i.test(message) && /does not exist|schema cache|not find/i.test(message)) {
    return 'ฐานข้อมูลยังไม่ได้อัปเกรด กรุณาให้ผู้ดูแลระบบรันไฟล์ RUN_THIS_SQL_FIX_ACCESS_MODE_ERROR.sql ใน Supabase SQL Editor'
  }
  if (/access_mode/i.test(message)) {
    return 'กรุณา Deploy ไฟล์ Production 2.0.3 และรัน SQL ซ่อมฐานข้อมูลที่แนบมา'
  }
  return message
}

async function fetchAllEvents(supabase: SupabaseClient): Promise<WorkspaceEvent[]> {
  const rows: WorkspaceEvent[] = []
  for (let from = 0; ; from += EVENT_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('workspace_scan_events')
      .select('event,created_at')
      .order('created_at', { ascending: true })
      .range(from, from + EVENT_PAGE_SIZE - 1)
    if (error) throw error
    const page = (data ?? []) as Array<{ event: WorkspaceEvent }>
    rows.push(...page.map(item => item.event).filter(item => Boolean(item?.id)))
    if (page.length < EVENT_PAGE_SIZE) break
  }
  return rows
}

export default function WorkspaceClient({ html }: { html: string }) {
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [ready, setReady] = useState(false)
  const [fatalError, setFatalError] = useState('')

  const post = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(message, '*')
  }, [])

  const getAccessToken = useCallback(async (supabase: SupabaseClient) => {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session?.access_token) throw new Error('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่')
    return data.session.access_token
  }, [])

  const appendEvent = useCallback(async (
    supabase: SupabaseClient,
    userId: string,
    event: WorkspaceEvent,
  ) => {
    if (!event?.id || !event.roundId) throw new Error('ข้อมูล Scan Event ไม่ครบถ้วน')
    const { error } = await supabase.from('workspace_scan_events').upsert({
      id: event.id,
      round_id: event.roundId,
      event,
      user_id: userId,
    }, { onConflict: 'id', ignoreDuplicates: true })
    if (error) throw error
    post({ type: 'MBC_EVENT_OK', payload: { event } })
  }, [post])

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    const initialize = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError || !authData.user) {
          router.replace('/login')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id,email,full_name,role,active')
          .eq('id', authData.user.id)
          .maybeSingle()
        if (profileError) throw profileError
        const current = profile as ProfileRow | null
        if (!current?.active) throw new Error('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ')

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id,email,full_name,role,active')
          .order('full_name', { ascending: true })
        if (profilesError) throw profilesError

        const { data: stateData, error: stateError } = await supabase
          .from('workspace_states')
          .select('id,state,revision,updated_at')
          .eq('id', WORKSPACE_ID)
          .maybeSingle()
        if (stateError) throw stateError

        const events = await fetchAllEvents(supabase)
        const row = stateData as WorkspaceStateRow | null
        const state = { ...((row?.state ?? {}) as Record<string, unknown>), scanEvents: events }
        const isAdmin = current.role === 'admin'
        const accessMode = accessModeFromRole(current.role)
        const users = ((profiles ?? []) as ProfileRow[]).map(user => ({
          id: user.id,
          name: user.full_name || user.email.split('@')[0],
          email: user.email,
          role: user.role,
          accessMode: accessModeFromRole(user.role),
          isAdmin: user.role === 'admin',
          active: user.active,
        }))

        if (!mounted) return
        setReady(true)

        const sendInit = () => post({
          type: 'MBC_INIT',
          payload: {
            currentUser: current,
            users,
            accessMode,
            isAdmin,
            state,
            revision: Number(row?.revision ?? 0),
            updatedAt: row?.updated_at ?? null,
          },
        })

        channelRef.current = supabase
          .channel(`mbc-inventory-${WORKSPACE_ID}`)
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'workspace_states', filter: `id=eq.${WORKSPACE_ID}`,
          }, async () => {
            const { data } = await supabase
              .from('workspace_states')
              .select('state,revision,updated_at')
              .eq('id', WORKSPACE_ID)
              .maybeSingle()
            if (!data) return
            post({ type: 'MBC_REMOTE_STATE', payload: { state: data.state, revision: data.revision, updatedAt: data.updated_at } })
          })
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'workspace_scan_events',
          }, (payload: { new: Record<string, unknown> }) => {
            const event = (payload.new as { event?: WorkspaceEvent })?.event
            if (event?.id) post({ type: 'MBC_REMOTE_EVENT', payload: { event } })
          })
          .subscribe()

        const onMessage = async (event: MessageEvent) => {
          if (event.source !== iframeRef.current?.contentWindow) return
          const message = (event.data ?? {}) as BridgeMessage
          try {
            if (message.type === 'MBC_READY') {
              sendInit()
              return
            }
            if (message.type === 'MBC_LOGOUT') {
              await supabase.auth.signOut()
              router.replace('/login')
              router.refresh()
              return
            }
            if (message.type === 'MBC_NAVIGATE' && message.path) {
              router.push(message.path)
              return
            }
            if (message.type === 'MBC_APPEND_EVENT' && message.event) {
              await appendEvent(supabase, current.id, message.event)
              return
            }
            if (message.type === 'MBC_SAVE_STATE' && message.state) {
              const { data, error } = await supabase.rpc('save_workspace_state', {
                p_state: message.state,
                p_base_revision: Number(message.baseRevision ?? 0),
              })
              if (error) throw error
              const saved = Array.isArray(data) ? data[0] : data
              if (!saved) {
                const { data: latest } = await supabase
                  .from('workspace_states')
                  .select('state,revision,updated_at')
                  .eq('id', WORKSPACE_ID)
                  .maybeSingle()
                post({
                  type: 'MBC_SAVE_CONFLICT',
                  payload: {
                    ...(latest ?? { state: {}, revision: 0, updated_at: null }),
                    updatedAt: latest?.updated_at ?? null,
                    message: 'ข้อมูลมีการเปลี่ยนแปลงจากผู้ใช้งานอื่น กรุณาทำรายการใหม่',
                    eventId: message.event?.id,
                  },
                })
                return
              }
              if (message.event) await appendEvent(supabase, current.id, message.event)
              post({
                type: 'MBC_SAVE_OK',
                payload: {
                  state: saved.state,
                  revision: saved.revision,
                  updatedAt: saved.updated_at,
                  eventId: message.event?.id,
                },
              })
              return
            }
            if (message.type === 'MBC_RESTORE_WORKSPACE' && message.state) {
              const token = await getAccessToken(supabase)
              const response = await fetch('/api/admin/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action: 'restore', state: message.state, events: message.events ?? [] }),
              })
              const result = await response.json()
              if (!response.ok) throw new Error(result.error || 'กู้คืนข้อมูลไม่สำเร็จ')
              post({ type: 'MBC_SAVE_OK', payload: result })
              return
            }
            if (message.type === 'MBC_ADMIN_CLEAR' && message.scope) {
              const token = await getAccessToken(supabase)
              const response = await fetch('/api/admin/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  action: 'clear', scope: message.scope, confirmation: message.confirmation,
                }),
              })
              const result = await response.json()
              if (!response.ok) throw new Error(result.error || 'ล้างข้อมูลไม่สำเร็จ')
              post({ type: 'MBC_ADMIN_CLEAR_OK', payload: result })
            }
          } catch (error) {
            const messageText = errorMessage(error, 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
            if (message.type === 'MBC_ADMIN_CLEAR') {
              post({ type: 'MBC_ADMIN_CLEAR_ERROR', payload: { message: messageText } })
            } else {
              post({ type: 'MBC_SAVE_ERROR', payload: { message: messageText } })
            }
          }
        }
        window.addEventListener('message', onMessage)

        return () => {
          window.removeEventListener('message', onMessage)
        }
      } catch (error) {
        if (!mounted) return
        setFatalError(errorMessage(error, 'ไม่สามารถเปิดระบบได้'))
        setReady(false)
      }
    }

    let cleanup: void | (() => void)
    void initialize().then(result => { cleanup = result })

    return () => {
      mounted = false
      cleanup?.()
      if (channelRef.current) void supabase.removeChannel(channelRef.current)
    }
  }, [appendEvent, getAccessToken, post, router])

  if (fatalError) {
    return <div className="workspace-loading"><div className="error">{fatalError}</div></div>
  }

  if (!ready) {
    return <div className="workspace-loading"><div className="workspace-spinner"/><b>กำลังเชื่อมต่อระบบตรวจนับ...</b></div>
  }

  return (
    <iframe
      ref={iframeRef}
      className="workspace-frame"
      title="MBC Inventory Workspace"
      srcDoc={html}
      sandbox="allow-scripts allow-forms allow-modals allow-downloads allow-same-origin"
    />
  )
}
