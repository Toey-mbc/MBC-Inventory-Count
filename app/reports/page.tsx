'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Boxes,
  Download,
  FileSpreadsheet,
  MapPin,
  RefreshCw,
  Search,
} from 'lucide-react'
import Protected from '@/components/Protected'
import { conditionLabel, conditionOptions, statusLabel } from '@/lib/constants'
import { exportWorkbook } from '@/lib/export'
import { createClient } from '@/lib/supabase/client'

type ReportView = 'detail' | 'sku' | 'location'

type RoundOption = {
  id: string
  code: string
  name: string
  status: string
  warehouse_id: string
  created_at?: string
  warehouses?: { code?: string | null; name?: string | null } | null
}

type WarehouseOption = { id: string; code: string; name: string }
type LocationOption = {
  id: string
  warehouse_id: string
  code: string
  name: string
  zone?: string | null
}

type ReportRow = {
  key: string
  roundId: string
  roundCode: string
  roundName: string
  roundStatus: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  locationId: string
  locationCode: string
  locationName: string
  zone: string
  productId: string
  sku: string
  productName: string
  condition: string
  quantity: number
  updatedAt: string
}

type SkuSummary = {
  productId: string
  sku: string
  productName: string
  quantity: number
  locations: number
  conditions: number
  lastUpdated: string
}

type LocationSummary = {
  locationId: string
  warehouseCode: string
  warehouseName: string
  locationCode: string
  locationName: string
  zone: string
  quantity: number
  skus: number
  conditions: number
  lastUpdated: string
}

const PAGE_SIZE = 100
const FETCH_SIZE = 1000

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function asNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('th-TH').format(value)
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function isMissingColumnError(error: any, column?: string) {
  const message = String(error?.message || error?.details || '')
  if (error?.code === '42703') return true
  if (!/column.+does not exist/i.test(message)) return false
  return !column || message.toLocaleLowerCase().includes(column.toLocaleLowerCase())
}

function isMissingReportViewError(error: any) {
  const message = String(error?.message || error?.details || '')
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    /inventory_count_report/i.test(message)
  )
}

function normalizeViewRow(raw: any): ReportRow {
  const round = firstRelation<any>(raw.count_rounds ?? raw.round)
  const product = firstRelation<any>(raw.products ?? raw.product)
  const location = firstRelation<any>(raw.locations ?? raw.location)
  const warehouse = firstRelation<any>(
    raw.warehouses ?? raw.warehouse ?? location?.warehouses ?? location?.warehouse,
  )

  const roundId = String(raw.round_id ?? round?.id ?? '')
  const productId = String(raw.product_id ?? product?.id ?? '')
  const locationId = String(raw.location_id ?? location?.id ?? '')
  const condition = String(raw.condition ?? '')

  return {
    key: `${roundId}:${productId}:${locationId}:${condition}`,
    roundId,
    roundCode: String(raw.round_code ?? round?.code ?? '-'),
    roundName: String(raw.round_name ?? round?.name ?? '-'),
    roundStatus: String(raw.round_status ?? round?.status ?? ''),
    warehouseId: String(raw.warehouse_id ?? warehouse?.id ?? location?.warehouse_id ?? ''),
    warehouseCode: String(raw.warehouse_code ?? warehouse?.code ?? '-'),
    warehouseName: String(raw.warehouse_name ?? warehouse?.name ?? '-'),
    locationId,
    locationCode: String(raw.location_code ?? location?.code ?? '-'),
    locationName: String(raw.location_name ?? location?.name ?? '-'),
    zone: String(raw.zone ?? location?.zone ?? '-'),
    productId,
    sku: String(raw.sku ?? product?.sku ?? '-'),
    productName: String(raw.product_name ?? product?.name ?? '-'),
    condition,
    quantity: asNumber(raw.quantity),
    updatedAt: String(raw.updated_at ?? ''),
  }
}

export default function ReportsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [rounds, setRounds] = useState<RoundOption[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [rows, setRows] = useState<ReportRow[]>([])
  const [selectedRound, setSelectedRound] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('all')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedCondition, setSelectedCondition] = useState('all')
  const [query, setQuery] = useState('')
  const [focusSku, setFocusSku] = useState('')
  const [view, setView] = useState<ReportView>('detail')
  const [page, setPage] = useState(1)
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingRows, setLoadingRows] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [sourceMode, setSourceMode] = useState<'view' | 'tables'>('tables')

  async function loadMetadata() {
    setLoadingMeta(true)
    setError('')

    const [roundResult, warehouseResult] = await Promise.all([
      supabase
        .from('count_rounds')
        .select('id,code,name,status,warehouse_id,created_at,warehouses(code,name)')
        .order('created_at', { ascending: false }),
      supabase.from('warehouses').select('id,code,name').eq('active', true).order('code'),
    ])

    let locationResult: any = await supabase
      .from('locations')
      .select('id,warehouse_id,code,name,zone')
      .eq('active', true)
      .order('code')

    // Older databases created from 001_initial.sql do not have locations.zone.
    // Keep the report usable while the repair SQL is being applied.
    if (locationResult.error && isMissingColumnError(locationResult.error, 'zone')) {
      locationResult = await supabase
        .from('locations')
        .select('id,warehouse_id,code,name')
        .eq('active', true)
        .order('code')
    }

    if (roundResult.error || warehouseResult.error || locationResult.error) {
      setError(
        roundResult.error?.message ||
          warehouseResult.error?.message ||
          locationResult.error?.message ||
          'โหลดตัวกรองไม่สำเร็จ',
      )
    }

    const nextRounds = (roundResult.data || []) as RoundOption[]
    const nextLocations = ((locationResult.data || []) as any[]).map((location) => ({
      ...location,
      zone: location.zone ?? null,
    })) as LocationOption[]

    setRounds(nextRounds)
    setWarehouses((warehouseResult.data || []) as WarehouseOption[])
    setLocations(nextLocations)
    setSelectedRound((current) => current || nextRounds[0]?.id || 'all')
    setLoadingMeta(false)
  }

  async function fetchReportRows(roundId: string) {
    const result: ReportRow[] = []
    let from = 0
    let useView = true
    let includeZone = true

    while (true) {
      const tableName = useView ? 'inventory_count_report' : 'scan_totals'
      const tableSelection = includeZone
        ? `
              round_id,product_id,location_id,condition,quantity,updated_at,
              count_rounds:count_rounds!scan_totals_round_id_fkey(id,code,name,status,warehouse_id),
              products:products!scan_totals_product_id_fkey(id,sku,name),
              locations:locations!scan_totals_location_id_fkey(
                id,code,name,zone,warehouse_id,
                warehouses:warehouses!locations_warehouse_id_fkey(id,code,name)
              )
            `
        : `
              round_id,product_id,location_id,condition,quantity,updated_at,
              count_rounds:count_rounds!scan_totals_round_id_fkey(id,code,name,status,warehouse_id),
              products:products!scan_totals_product_id_fkey(id,sku,name),
              locations:locations!scan_totals_location_id_fkey(
                id,code,name,warehouse_id,
                warehouses:warehouses!locations_warehouse_id_fkey(id,code,name)
              )
            `

      let queryBuilder: any = supabase
        .from(tableName)
        .select(useView ? '*' : tableSelection)

      if (roundId && roundId !== 'all') queryBuilder = queryBuilder.eq('round_id', roundId)
      queryBuilder = queryBuilder
        .order('updated_at', { ascending: false })
        .range(from, from + FETCH_SIZE - 1)

      const { data, error: fetchError } = await queryBuilder
      if (fetchError) {
        if (useView && (isMissingReportViewError(fetchError) || isMissingColumnError(fetchError))) {
          useView = false
          includeZone = true
          result.length = 0
          from = 0
          continue
        }
        if (!useView && includeZone && isMissingColumnError(fetchError, 'zone')) {
          includeZone = false
          result.length = 0
          from = 0
          continue
        }
        throw fetchError
      }

      const batch = (data || []).map(normalizeViewRow)
      result.push(...batch)
      if (batch.length < FETCH_SIZE) {
        setSourceMode(useView ? 'view' : 'tables')
        return result
      }
      from += FETCH_SIZE
    }
  }

  async function loadRows() {
    if (!selectedRound) return
    setLoadingRows(true)
    setError('')
    try {
      const data = await fetchReportRows(selectedRound)
      setRows(data)
    } catch (loadError: any) {
      setRows([])
      setError(loadError?.message || 'โหลดรายงานไม่สำเร็จ')
    } finally {
      setLoadingRows(false)
    }
  }

  useEffect(() => {
    void loadMetadata()
  }, [])

  useEffect(() => {
    if (selectedRound) void loadRows()
  }, [selectedRound])

  useEffect(() => {
    setPage(1)
  }, [selectedWarehouse, selectedLocation, selectedCondition, selectedRound, query, focusSku, view])

  const availableLocations = useMemo(
    () =>
      locations.filter(
        (location) => selectedWarehouse === 'all' || location.warehouse_id === selectedWarehouse,
      ),
    [locations, selectedWarehouse],
  )

  useEffect(() => {
    if (
      selectedLocation !== 'all' &&
      !availableLocations.some((location) => location.id === selectedLocation)
    ) {
      setSelectedLocation('all')
    }
  }, [availableLocations, selectedLocation])

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('th-TH')
    return rows.filter((row) => {
      if (selectedWarehouse !== 'all' && row.warehouseId !== selectedWarehouse) return false
      if (selectedLocation !== 'all' && row.locationId !== selectedLocation) return false
      if (selectedCondition !== 'all' && row.condition !== selectedCondition) return false
      if (focusSku && row.sku !== focusSku) return false
      if (!keyword) return true
      return [
        row.sku,
        row.productName,
        row.locationCode,
        row.locationName,
        row.zone,
        row.warehouseCode,
        row.warehouseName,
        row.roundCode,
        row.roundName,
        conditionLabel(row.condition),
      ].some((value) => value.toLocaleLowerCase('th-TH').includes(keyword))
    })
  }, [rows, selectedWarehouse, selectedLocation, selectedCondition, focusSku, query])

  const skuSummary = useMemo<SkuSummary[]>(() => {
    const map = new Map<
      string,
      SkuSummary & { locationIds: Set<string>; conditionIds: Set<string> }
    >()
    for (const row of filteredRows) {
      const current = map.get(row.productId) || {
        productId: row.productId,
        sku: row.sku,
        productName: row.productName,
        quantity: 0,
        locations: 0,
        conditions: 0,
        lastUpdated: '',
        locationIds: new Set<string>(),
        conditionIds: new Set<string>(),
      }
      current.quantity += row.quantity
      current.locationIds.add(row.locationId)
      current.conditionIds.add(row.condition)
      if (!current.lastUpdated || row.updatedAt > current.lastUpdated) current.lastUpdated = row.updatedAt
      map.set(row.productId, current)
    }
    return Array.from(map.values())
      .map(({ locationIds, conditionIds, ...item }) => ({
        ...item,
        locations: locationIds.size,
        conditions: conditionIds.size,
      }))
      .sort((a, b) => b.quantity - a.quantity || a.sku.localeCompare(b.sku))
  }, [filteredRows])

  const locationSummary = useMemo<LocationSummary[]>(() => {
    const map = new Map<
      string,
      LocationSummary & { productIds: Set<string>; conditionIds: Set<string> }
    >()
    for (const row of filteredRows) {
      const current = map.get(row.locationId) || {
        locationId: row.locationId,
        warehouseCode: row.warehouseCode,
        warehouseName: row.warehouseName,
        locationCode: row.locationCode,
        locationName: row.locationName,
        zone: row.zone,
        quantity: 0,
        skus: 0,
        conditions: 0,
        lastUpdated: '',
        productIds: new Set<string>(),
        conditionIds: new Set<string>(),
      }
      current.quantity += row.quantity
      current.productIds.add(row.productId)
      current.conditionIds.add(row.condition)
      if (!current.lastUpdated || row.updatedAt > current.lastUpdated) current.lastUpdated = row.updatedAt
      map.set(row.locationId, current)
    }
    return Array.from(map.values())
      .map(({ productIds, conditionIds, ...item }) => ({
        ...item,
        skus: productIds.size,
        conditions: conditionIds.size,
      }))
      .sort(
        (a, b) =>
          a.warehouseCode.localeCompare(b.warehouseCode) ||
          a.locationCode.localeCompare(b.locationCode),
      )
  }, [filteredRows])

  const totalQuantity = useMemo(
    () => filteredRows.reduce((sum, row) => sum + row.quantity, 0),
    [filteredRows],
  )
  const totalSku = useMemo(
    () => new Set(filteredRows.map((row) => row.productId)).size,
    [filteredRows],
  )
  const totalLocations = useMemo(
    () => new Set(filteredRows.map((row) => row.locationId)).size,
    [filteredRows],
  )

  const currentRows =
    view === 'detail' ? filteredRows : view === 'sku' ? skuSummary : locationSummary
  const pageCount = Math.max(1, Math.ceil(currentRows.length / PAGE_SIZE))
  const visibleRows = currentRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function showSkuDetail(sku: string) {
    setFocusSku(sku)
    setSelectedLocation('all')
    setView('detail')
  }

  function showLocationDetail(locationId: string) {
    setSelectedLocation(locationId)
    setFocusSku('')
    setView('detail')
  }

  function clearFilters() {
    setSelectedWarehouse('all')
    setSelectedLocation('all')
    setSelectedCondition('all')
    setQuery('')
    setFocusSku('')
  }

  async function exportReport() {
    setExporting(true)
    try {
      const roundLabel = rounds.find((round) => round.id === selectedRound)?.code || 'ALL'
      await exportWorkbook(
        [
          {
            name: 'รายละเอียด SKU-Location',
            rows: filteredRows.map((row) => ({
              รอบตรวจนับ: row.roundCode,
              ชื่อรอบ: row.roundName,
              สถานะรอบ: statusLabel(row.roundStatus),
              คลัง: row.warehouseCode,
              ชื่อคลัง: row.warehouseName,
              โลเคชั่น: row.locationCode,
              ชื่อโลเคชั่น: row.locationName,
              โซน: row.zone,
              SKU: row.sku,
              ชื่อสินค้า: row.productName,
              สภาพสินค้า: conditionLabel(row.condition),
              จำนวน: row.quantity,
              อัปเดตล่าสุด: formatDateTime(row.updatedAt),
            })),
          },
          {
            name: 'สรุปตาม SKU',
            rows: skuSummary.map((row) => ({
              SKU: row.sku,
              ชื่อสินค้า: row.productName,
              จำนวนรวม: row.quantity,
              จำนวนโลเคชั่น: row.locations,
              จำนวนสภาพสินค้า: row.conditions,
              อัปเดตล่าสุด: formatDateTime(row.lastUpdated),
            })),
          },
          {
            name: 'สรุปตามโลเคชั่น',
            rows: locationSummary.map((row) => ({
              คลัง: row.warehouseCode,
              ชื่อคลัง: row.warehouseName,
              โลเคชั่น: row.locationCode,
              ชื่อโลเคชั่น: row.locationName,
              โซน: row.zone,
              จำนวนรวม: row.quantity,
              จำนวน_SKU: row.skus,
              จำนวนสภาพสินค้า: row.conditions,
              อัปเดตล่าสุด: formatDateTime(row.lastUpdated),
            })),
          },
          {
            name: 'เงื่อนไขรายงาน',
            rows: [
              {
                รอบตรวจนับ:
                  rounds.find((round) => round.id === selectedRound)?.code || 'ทุกรอบ',
                คลัง:
                  warehouses.find((warehouse) => warehouse.id === selectedWarehouse)?.code ||
                  'ทุกคลัง',
                โลเคชั่น:
                  locations.find((location) => location.id === selectedLocation)?.code ||
                  'ทุกโลเคชั่น',
                สภาพสินค้า:
                  selectedCondition === 'all' ? 'ทุกสภาพ' : conditionLabel(selectedCondition),
                คำค้นหา: query || '-',
                SKU_ที่เจาะดู: focusSku || '-',
                จำนวนรายการรายละเอียด: filteredRows.length,
                จำนวนรวม: totalQuantity,
                วันที่ส่งออก: formatDateTime(new Date().toISOString()),
              },
            ],
          },
        ],
        `MBC_Inventory_Report_${roundLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      )
    } catch (exportError: any) {
      alert(exportError?.message || 'ส่งออกรายงานไม่สำเร็จ')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Protected>
      <div className="page-head report-page-head">
        <div>
          <div className="page-title">รายงานตรวจนับแบบละเอียด</div>
          <div className="muted">
            ดูได้ถึงระดับรอบตรวจนับ → คลัง → โลเคชั่น → SKU → สภาพสินค้า
          </div>
        </div>
        <div className="report-head-actions">
          <button className="btn secondary" onClick={() => void loadRows()} disabled={loadingRows}>
            <RefreshCw size={17} /> {loadingRows ? 'กำลังโหลด' : 'รีเฟรช'}
          </button>
          <button
            className="btn primary"
            onClick={() => void exportReport()}
            disabled={exporting || filteredRows.length === 0}
          >
            <Download size={17} /> {exporting ? 'กำลังส่งออก' : 'ส่งออก Excel'}
          </button>
        </div>
      </div>

      {error && <div className="error report-error">{error}</div>}

      <section className="card report-filter-card">
        <div className="report-filter-grid">
          <div className="field">
            <label>รอบตรวจนับ</label>
            <select
              value={selectedRound}
              onChange={(event) => {
                setSelectedRound(event.target.value)
                setFocusSku('')
              }}
              disabled={loadingMeta}
            >
              <option value="all">ทุกรอบตรวจนับ</option>
              {rounds.map((round) => (
                <option key={round.id} value={round.id}>
                  {round.code} — {round.name} ({statusLabel(round.status)})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>คลัง</label>
            <select
              value={selectedWarehouse}
              onChange={(event) => setSelectedWarehouse(event.target.value)}
            >
              <option value="all">ทุกคลัง</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} — {warehouse.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>โลเคชั่น</label>
            <select
              value={selectedLocation}
              onChange={(event) => setSelectedLocation(event.target.value)}
            >
              <option value="all">ทุกโลเคชั่น</option>
              {availableLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.code} — {location.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>สภาพสินค้า</label>
            <select
              value={selectedCondition}
              onChange={(event) => setSelectedCondition(event.target.value)}
            >
              <option value="all">ทุกสภาพสินค้า</option>
              {conditionOptions.map((condition) => (
                <option key={condition.value} value={condition.value}>
                  {condition.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field report-search-field">
            <label>ค้นหา SKU / สินค้า / โลเคชั่น</label>
            <div className="report-search-wrap">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="เช่น PB-Y47, A-01, คลังหลัก"
              />
            </div>
          </div>
          <div className="field report-clear-field">
            <label>&nbsp;</label>
            <button className="btn secondary" onClick={clearFilters}>
              ล้างตัวกรอง
            </button>
          </div>
        </div>
        {(focusSku || selectedLocation !== 'all') && (
          <div className="report-active-filters">
            <span>กำลังเจาะรายละเอียด:</span>
            {focusSku && (
              <button className="report-filter-chip" onClick={() => setFocusSku('')}>
                SKU {focusSku} ×
              </button>
            )}
            {selectedLocation !== 'all' && (
              <button className="report-filter-chip" onClick={() => setSelectedLocation('all')}>
                Location {locations.find((item) => item.id === selectedLocation)?.code || '-'} ×
              </button>
            )}
          </div>
        )}
      </section>

      <div className="kpi-grid report-kpi-grid">
        <div className="card kpi-card">
          <div className="muted">จำนวนรวมที่ตรวจนับ</div>
          <div className="kpi">{formatNumber(totalQuantity)}</div>
          <div className="kpi-icon"><Boxes size={20} /></div>
        </div>
        <div className="card kpi-card">
          <div className="muted">SKU ที่พบ</div>
          <div className="kpi">{formatNumber(totalSku)}</div>
          <div className="kpi-icon"><FileSpreadsheet size={20} /></div>
        </div>
        <div className="card kpi-card">
          <div className="muted">โลเคชั่นที่มีสินค้า</div>
          <div className="kpi">{formatNumber(totalLocations)}</div>
          <div className="kpi-icon"><MapPin size={20} /></div>
        </div>
        <div className="card kpi-card">
          <div className="muted">รายการ SKU × Location</div>
          <div className="kpi">{formatNumber(filteredRows.length)}</div>
          <div className="kpi-icon"><BarChart3 size={20} /></div>
        </div>
      </div>

      <section className="card report-table-card">
        <div className="report-table-toolbar">
          <div className="report-tabs" role="tablist" aria-label="รูปแบบรายงาน">
            <button
              className={view === 'detail' ? 'active' : ''}
              onClick={() => setView('detail')}
            >
              รายละเอียด SKU × Location
            </button>
            <button className={view === 'sku' ? 'active' : ''} onClick={() => setView('sku')}>
              สรุปตาม SKU
            </button>
            <button
              className={view === 'location' ? 'active' : ''}
              onClick={() => setView('location')}
            >
              สรุปตามโลเคชั่น
            </button>
          </div>
          <div className="report-table-meta">
            {loadingRows ? 'กำลังดึงข้อมูล...' : `${formatNumber(currentRows.length)} รายการ`}
            <span className="report-source-badge">
              {sourceMode === 'view' ? 'Report View' : 'Live Tables'}
            </span>
          </div>
        </div>

        <div className="table-wrap report-table-wrap">
          {view === 'detail' && (
            <table className="table report-table report-detail-table">
              <thead>
                <tr>
                  <th>รอบตรวจนับ</th>
                  <th>คลัง</th>
                  <th>โลเคชั่น</th>
                  <th>โซน</th>
                  <th>SKU</th>
                  <th>ชื่อสินค้า</th>
                  <th>สภาพ</th>
                  <th className="number-cell">จำนวน</th>
                  <th>อัปเดตล่าสุด</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length > 0 ? (
                  (visibleRows as ReportRow[]).map((row) => (
                    <tr key={row.key}>
                      <td>
                        <b>{row.roundCode}</b>
                        <small>{statusLabel(row.roundStatus)}</small>
                      </td>
                      <td>
                        <b>{row.warehouseCode}</b>
                        <small>{row.warehouseName}</small>
                      </td>
                      <td>
                        <b>{row.locationCode}</b>
                        <small>{row.locationName}</small>
                      </td>
                      <td>{row.zone}</td>
                      <td><b className="report-sku">{row.sku}</b></td>
                      <td>{row.productName}</td>
                      <td><span className="badge">{conditionLabel(row.condition)}</span></td>
                      <td className="number-cell"><b>{formatNumber(row.quantity)}</b></td>
                      <td>{formatDateTime(row.updatedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="empty-state">
                      {loadingRows ? 'กำลังดึงข้อมูลรายงาน...' : 'ไม่พบข้อมูลตามเงื่อนไขที่เลือก'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {view === 'sku' && (
            <table className="table report-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>ชื่อสินค้า</th>
                  <th className="number-cell">จำนวนรวม</th>
                  <th className="number-cell">โลเคชั่น</th>
                  <th className="number-cell">สภาพสินค้า</th>
                  <th>อัปเดตล่าสุด</th>
                  <th>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length > 0 ? (
                  (visibleRows as SkuSummary[]).map((row) => (
                    <tr key={row.productId}>
                      <td><b className="report-sku">{row.sku}</b></td>
                      <td>{row.productName}</td>
                      <td className="number-cell"><b>{formatNumber(row.quantity)}</b></td>
                      <td className="number-cell">{formatNumber(row.locations)}</td>
                      <td className="number-cell">{formatNumber(row.conditions)}</td>
                      <td>{formatDateTime(row.lastUpdated)}</td>
                      <td>
                        <button className="btn secondary report-detail-btn" onClick={() => showSkuDetail(row.sku)}>
                          ดูตามโลเคชั่น
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="empty-state">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>
                )}
              </tbody>
            </table>
          )}

          {view === 'location' && (
            <table className="table report-table">
              <thead>
                <tr>
                  <th>คลัง</th>
                  <th>โลเคชั่น</th>
                  <th>โซน</th>
                  <th className="number-cell">จำนวนรวม</th>
                  <th className="number-cell">SKU</th>
                  <th className="number-cell">สภาพสินค้า</th>
                  <th>อัปเดตล่าสุด</th>
                  <th>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length > 0 ? (
                  (visibleRows as LocationSummary[]).map((row) => (
                    <tr key={row.locationId}>
                      <td>
                        <b>{row.warehouseCode}</b>
                        <small>{row.warehouseName}</small>
                      </td>
                      <td>
                        <b>{row.locationCode}</b>
                        <small>{row.locationName}</small>
                      </td>
                      <td>{row.zone}</td>
                      <td className="number-cell"><b>{formatNumber(row.quantity)}</b></td>
                      <td className="number-cell">{formatNumber(row.skus)}</td>
                      <td className="number-cell">{formatNumber(row.conditions)}</td>
                      <td>{formatDateTime(row.lastUpdated)}</td>
                      <td>
                        <button
                          className="btn secondary report-detail-btn"
                          onClick={() => showLocationDetail(row.locationId)}
                        >
                          ดูรายการ SKU
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={8} className="empty-state">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="report-pagination">
          <span>
            หน้า {page} / {pageCount} · แสดง {visibleRows.length} จาก {formatNumber(currentRows.length)} รายการ
          </span>
          <div>
            <button className="btn secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              ก่อนหน้า
            </button>
            <button className="btn secondary" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>
              ถัดไป
            </button>
          </div>
        </div>
      </section>
    </Protected>
  )
}
