'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Download, Link2, RefreshCw, Search } from 'lucide-react'
import Protected from '@/components/Protected'
import { createClient } from '@/lib/supabase/client'
import { conditionLabel, statusLabel } from '@/lib/constants'
import { exportXlsx } from '@/lib/export'
import type { CountRound, Product } from '@/lib/types'

type Variance = {
  round_id: string
  product_id: string
  sku: string
  product_name: string
  brand: string
  category: string
  unit: string
  location_id: string
  location_code: string
  location_name: string
  warehouse_name: string
  condition: string
  system_quantity: number
  counted_quantity: number
  difference: number
}

type Unknown = {
  id: string
  barcode: string
  quantity: number
  condition: string
  status: string
  locations?: {
    code?: string | null
    name?: string | null
    warehouses?: { code?: string | null; name?: string | null } | null
  } | null
  first_seen_at: string
}

export default function VariancePage() {
  const supabase = useMemo(() => createClient(), [])
  const [rounds, setRounds] = useState<CountRound[]>([])
  const [roundId, setRoundId] = useState('')
  const [rows, setRows] = useState<Variance[]>([])
  const [unknown, setUnknown] = useState<Unknown[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [brand, setBrand] = useState('all')
  const [condition, setCondition] = useState('all')
  const [tab, setTab] = useState<'variance' | 'unknown'>('variance')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadBase = useCallback(async () => {
    const [{ data: roundRows, error: roundError }, { data: productRows, error: productError }] =
      await Promise.all([
        supabase
          .from('count_rounds')
          .select('*,warehouses(code,name)')
          .in('status', ['active', 'review', 'approved'])
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('id,sku,name,brand,category,unit,cost,photo_url,notes,active,product_barcodes(barcode,is_primary)')
          .eq('active', true)
          .order('sku'),
      ])

    if (roundError || productError) {
      setError(roundError?.message || productError?.message || 'โหลดข้อมูลหลักไม่สำเร็จ')
      return
    }

    const nextRounds = (roundRows || []) as CountRound[]
    setRounds(nextRounds)
    setProducts((productRows || []) as Product[])

    const requested =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('round') || ''
        : ''

    if (requested && nextRounds.some((round) => round.id === requested)) {
      setRoundId(requested)
    } else if (!roundId && nextRounds[0]) {
      setRoundId(nextRounds[0].id)
    }
  }, [roundId, supabase])

  const load = useCallback(async () => {
    if (!roundId) {
      setRows([])
      setUnknown([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    const [{ data: varianceRows, error: varianceError }, { data: unknownRows, error: unknownError }] =
      await Promise.all([
        supabase.from('v_round_variance').select('*').eq('round_id', roundId).order('brand').order('sku'),
        supabase
          .from('unknown_barcodes')
          .select('id,barcode,quantity,condition,status,first_seen_at,locations(code,name,warehouses(code,name))')
          .eq('round_id', roundId)
          .order('updated_at', { ascending: false }),
      ])

    if (varianceError || unknownError) {
      setError(varianceError?.message || unknownError?.message || 'โหลดข้อมูลไม่สำเร็จ')
    }
    setRows((varianceRows || []) as Variance[])
    setUnknown((unknownRows || []) as Unknown[])
    setLoading(false)
  }, [roundId, supabase])

  useEffect(() => {
    void loadBase()
  }, [loadBase])

  useEffect(() => {
    void load()
  }, [load])

  const brands = [...new Set(rows.map((row) => row.brand).filter(Boolean))].sort()
  const filtered = rows.filter((row) => {
    const query = search.toLowerCase()
    const statusMatched =
      status === 'all' ||
      (status === 'short' && Number(row.difference) < 0) ||
      (status === 'over' && Number(row.difference) > 0) ||
      (status === 'equal' && Number(row.difference) === 0) ||
      (status === 'uncounted' && Number(row.counted_quantity) === 0 && Number(row.system_quantity) > 0)

    return (
      statusMatched &&
      (brand === 'all' || row.brand === brand) &&
      (condition === 'all' || row.condition === condition) &&
      `${row.sku} ${row.product_name} ${row.brand} ${row.location_code}`.toLowerCase().includes(query)
    )
  })

  const summary = filtered.reduce(
    (result, row) => {
      result.system += Number(row.system_quantity)
      result.counted += Number(row.counted_quantity)
      if (row.difference < 0) result.short += Math.abs(Number(row.difference))
      if (row.difference > 0) result.over += Number(row.difference)
      return result
    },
    { system: 0, counted: 0, short: 0, over: 0 },
  )

  async function exportReport() {
    await exportXlsx(
      filtered.map((row) => ({
        SKU: row.sku,
        สินค้า: row.product_name,
        แบรนด์: row.brand,
        คลัง: row.warehouse_name,
        โลเคชั่น: `${row.location_code} ${row.location_name}`,
        สภาพ: conditionLabel(row.condition),
        ยอดตามระบบ: row.system_quantity,
        นับจริง: row.counted_quantity,
        ผลต่าง: row.difference,
        หน่วย: row.unit,
      })),
      'MBC_Stock_Variance.xlsx',
      'ผลต่างสต๊อก',
    )
  }

  async function resolveUnknown(item: Unknown) {
    const sku = window.prompt(`ระบุ SKU ที่ต้องการผูกกับบาร์โค้ด ${item.barcode}`)
    if (!sku) return
    const product = products.find((row) => row.sku.toLowerCase() === sku.trim().toLowerCase())
    if (!product) {
      setError('ไม่พบ SKU ที่ระบุ')
      return
    }
    if (!window.confirm(`ผูกบาร์โค้ด ${item.barcode} กับ ${product.sku} · ${product.name} หรือไม่?`)) return

    setError('')
    const { data: owner, error: ownerError } = await supabase
      .from('product_barcodes')
      .select('product_id')
      .eq('barcode', item.barcode)
      .maybeSingle()

    if (ownerError) {
      setError(ownerError.message)
      return
    }
    if (owner && owner.product_id !== product.id) {
      setError('บาร์โค้ดนี้ถูกผูกกับสินค้าอื่นแล้ว กรุณาตรวจสอบก่อนแก้ไข')
      return
    }
    if (!owner) {
      const { error: barcodeError } = await supabase.from('product_barcodes').insert({
        product_id: product.id,
        barcode: item.barcode,
        is_primary: false,
      })
      if (barcodeError) {
        setError(barcodeError.message)
        return
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error: updateError } = await supabase
      .from('unknown_barcodes')
      .update({
        status: 'linked',
        resolved_product_id: product.id,
        resolved_by: user?.id || null,
        resolved_at: new Date().toISOString(),
        resolution_note: `ผูกกับ ${product.sku}`,
      })
      .eq('id', item.id)

    if (updateError) setError(updateError.message)
    else {
      setMessage('ผูกบาร์โค้ดกับสินค้าเรียบร้อยแล้ว รายการเดิมยังอยู่ในประวัติและควรนับสินค้านี้ใหม่')
      await load()
    }
  }

  async function ignoreUnknown(item: Unknown) {
    const note = window.prompt('เหตุผลที่ข้ามบาร์โค้ดนี้', 'ไม่ใช่สินค้าคงคลัง')
    if (!note) return
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error: updateError } = await supabase
      .from('unknown_barcodes')
      .update({
        status: 'ignored',
        resolved_by: user?.id || null,
        resolved_at: new Date().toISOString(),
        resolution_note: note,
      })
      .eq('id', item.id)

    if (updateError) setError(updateError.message)
    else {
      setMessage('ข้ามรายการแล้ว')
      await load()
    }
  }

  const current = rounds.find((round) => round.id === roundId)

  return (
    <Protected>
      <div className="page-head">
        <div>
          <h1>ผลต่างสต๊อก</h1>
          <p>เปรียบเทียบ Snapshot ยอดตามระบบกับยอดตรวจนับจริงก่อนอนุมัติ</p>
        </div>
        <div className="actions">
          <button className="btn outline" onClick={() => void load()}><RefreshCw size={15}/>รีเฟรช</button>
          <button className="btn primary" onClick={() => void exportReport()} disabled={!filtered.length}><Download size={15}/>ส่งออก Excel</button>
        </div>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 12 }}>{error}</div>}
      {message && <div className="success-box" style={{ marginBottom: 12 }}>{message}</div>}

      <div className="filters" style={{ gridTemplateColumns: 'minmax(220px,2fr) repeat(3,minmax(130px,1fr))' }}>
        <div className="field"><label>รอบตรวจนับ</label><select value={roundId} onChange={(event) => setRoundId(event.target.value)}><option value="">เลือกรอบ</option>{rounds.map((round) => <option key={round.id} value={round.id}>{round.code} · {round.name} · {statusLabel(round.status)}</option>)}</select></div>
        <div className="field"><label>แบรนด์</label><select value={brand} onChange={(event) => setBrand(event.target.value)}><option value="all">ทุกแบรนด์</option>{brands.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="field"><label>สภาพสินค้า</label><select value={condition} onChange={(event) => setCondition(event.target.value)}><option value="all">ทุกสภาพ</option>{[...new Set(rows.map((row) => row.condition))].map((item) => <option key={item} value={item}>{conditionLabel(item)}</option>)}</select></div>
        <div className="field"><label>สถานะผลต่าง</label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">ทั้งหมด</option><option value="short">จำนวนขาด</option><option value="over">จำนวนเกิน</option><option value="equal">จำนวนตรง</option><option value="uncounted">ยังไม่ได้นับ</option></select></div>
      </div>

      <div className="grid kpi-grid">
        <Summary label="ยอดตามระบบ" value={summary.system}/>
        <Summary label="ยอดนับจริง" value={summary.counted} tone="good"/>
        <Summary label="จำนวนขาด" value={summary.short} tone="bad"/>
        <Summary label="จำนวนเกิน" value={summary.over} tone="warn"/>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'variance' ? 'active' : ''}`} onClick={() => setTab('variance')}>ผลต่างสินค้า ({rows.length})</button>
        <button className={`tab ${tab === 'unknown' ? 'active' : ''}`} onClick={() => setTab('unknown')}>บาร์โค้ดไม่พบ ({unknown.filter((row) => row.status === 'open').length})</button>
      </div>

      {tab === 'variance' ? (
        <div className="card">
          <div className="toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหา SKU ชื่อสินค้า แบรนด์ หรือโลเคชั่น"/></div><div className="stat-strip"><div className="stat-pill">รอบ <strong>{current?.code || '-'}</strong></div><div className="stat-pill">รายการ <strong>{filtered.length}</strong></div></div></div>
          <div className="table-wrap"><table className="table"><thead><tr><th>SKU / สินค้า</th><th>แบรนด์</th><th>คลัง / โลเคชั่น</th><th>สภาพ</th><th>ตามระบบ</th><th>นับจริง</th><th>ผลต่าง</th><th>สถานะ</th></tr></thead><tbody>{loading ? <tr><td colSpan={8} className="empty">กำลังโหลด...</td></tr> : filtered.length ? filtered.map((row) => <tr key={`${row.product_id}-${row.location_id}-${row.condition}`}><td className="wrap"><strong>{row.sku}</strong><div className="muted">{row.product_name}</div></td><td>{row.brand || '-'}</td><td>{row.warehouse_name}<div className="muted">{row.location_code} · {row.location_name}</div></td><td><span className="badge dark">{conditionLabel(row.condition)}</span></td><td>{Number(row.system_quantity).toLocaleString()}</td><td>{Number(row.counted_quantity).toLocaleString()}</td><td className={row.difference > 0 ? 'diff-pos' : row.difference < 0 ? 'diff-neg' : 'diff-zero'}>{row.difference > 0 ? '+' : ''}{Number(row.difference).toLocaleString()}</td><td><VarianceBadge row={row}/></td></tr>) : <tr><td colSpan={8} className="empty">ไม่พบรายการตามตัวกรอง</td></tr>}</tbody></table></div>
        </div>
      ) : (
        <div className="card">
          <div className="notice" style={{ marginBottom: 13, display: 'flex', gap: 8, alignItems: 'center' }}><AlertCircle size={16}/><span>การผูกบาร์โค้ดจะใช้กับการยิงครั้งถัดไป รายการเดิมที่ยิงไม่พบจะไม่ถูกย้ายเป็นยอดสินค้าอัตโนมัติเพื่อรักษาประวัติ</span></div>
          <div className="table-wrap"><table className="table"><thead><tr><th>บาร์โค้ด</th><th>คลัง / โลเคชั่น</th><th>สภาพ</th><th>จำนวน</th><th>พบครั้งแรก</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>{unknown.length ? unknown.map((item) => <tr key={item.id}><td><strong>{item.barcode}</strong></td><td>{item.locations?.warehouses?.name || '-'} / {item.locations?.code || '-'}</td><td>{conditionLabel(item.condition)}</td><td>{Number(item.quantity).toLocaleString()}</td><td>{new Date(item.first_seen_at).toLocaleString('th-TH')}</td><td><span className={`badge ${item.status === 'open' ? 'bad' : item.status === 'linked' ? 'ok' : 'dark'}`}>{item.status === 'open' ? 'รอตรวจสอบ' : item.status === 'linked' ? 'ผูกแล้ว' : 'ข้ามแล้ว'}</span></td><td>{item.status === 'open' && <div className="actions"><button className="btn small secondary" onClick={() => void resolveUnknown(item)}><Link2 size={13}/>ผูกสินค้า</button><button className="btn small outline" onClick={() => void ignoreUnknown(item)}>ข้าม</button></div>}</td></tr>) : <tr><td colSpan={7} className="empty">ไม่มีบาร์โค้ดไม่พบในรอบนี้</td></tr>}</tbody></table></div>
        </div>
      )}
    </Protected>
  )
}

function Summary({ label, value, tone = '' }: { label: string; value: number; tone?: string }) {
  return <div className={`kpi-card ${tone}`}><div className="kpi-label">{label}</div><div className="kpi-value">{value.toLocaleString()}</div><div className="kpi-sub">ตามรายการที่กรอง</div></div>
}

function VarianceBadge({ row }: { row: Variance }) {
  if (row.counted_quantity === 0 && row.system_quantity > 0) return <span className="badge bad">ยังไม่ได้นับ</span>
  if (row.difference < 0) return <span className="badge bad">จำนวนขาด</span>
  if (row.difference > 0) return <span className="badge warn">จำนวนเกิน</span>
  return <span className="badge ok">จำนวนตรง</span>
}
