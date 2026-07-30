'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Edit3, MapPin, Plus, Printer, QrCode, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import Protected from '@/components/Protected'
import { createClient } from '@/lib/supabase/client'
import { conditionLabel, conditionOptions } from '@/lib/constants'
import { useProfile } from '@/lib/useProfile'
import type { Location, StockCondition, Warehouse } from '@/lib/types'

type WarehouseForm = {
  id: string
  code: string
  name: string
  description: string
  address: string
  active: boolean
}

type LocationForm = {
  id: string
  warehouse_id: string
  code: string
  name: string
  zone: string
  default_condition: StockCondition
  notes: string
  active: boolean
  scan_code: string
}

const emptyWarehouse: WarehouseForm = {
  id: '',
  code: '',
  name: '',
  description: '',
  address: '',
  active: true,
}

const emptyLocation: LocationForm = {
  id: '',
  warehouse_id: '',
  code: '',
  name: '',
  zone: '',
  default_condition: 'good',
  notes: '',
  active: true,
  scan_code: '',
}

function toWarehouseForm(row: Warehouse): WarehouseForm {
  return {
    id: row.id,
    code: row.code ?? '',
    name: row.name ?? '',
    description: row.description ?? '',
    address: row.address ?? '',
    active: row.active !== false,
  }
}

function toLocationForm(row: Location): LocationForm {
  return {
    id: row.id,
    warehouse_id: row.warehouse_id ?? '',
    code: row.code ?? '',
    name: row.name ?? '',
    zone: row.zone ?? '',
    default_condition: row.default_condition ?? 'good',
    notes: row.notes ?? '',
    active: row.active !== false,
    scan_code: row.scan_code ?? '',
  }
}

export default function LocationsPage() {
  const supabase = useMemo(() => createClient(), [])
  const { profile } = useProfile()
  const canManage = Boolean(
    profile && ['admin', 'warehouse_manager', 'sale_support'].includes(profile.role),
  )

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [selected, setSelected] = useState('')
  const [warehouseOpen, setWarehouseOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [qrLocation, setQrLocation] = useState<Location | null>(null)
  const [warehouseForm, setWarehouseForm] = useState<WarehouseForm>(emptyWarehouse)
  const [locationForm, setLocationForm] = useState<LocationForm>(emptyLocation)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    const [warehouseResult, locationResult] = await Promise.all([
      supabase.from('warehouses').select('*').order('code'),
      supabase.from('locations').select('*,warehouses(code,name)').order('code'),
    ])

    if (warehouseResult.error || locationResult.error) {
      setError(
        warehouseResult.error?.message ||
          locationResult.error?.message ||
          'โหลดข้อมูลไม่สำเร็จ',
      )
      return
    }

    const nextWarehouses = (warehouseResult.data || []) as Warehouse[]
    setWarehouses(nextWarehouses)
    setLocations((locationResult.data || []) as Location[])
    setSelected((current) => {
      if (current && nextWarehouses.some((row) => row.id === current)) return current
      return nextWarehouses[0]?.id || ''
    })
  }, [supabase])

  useEffect(() => {
    void load()
  }, [load])

  function addWarehouse() {
    setError('')
    setMessage('')
    setWarehouseForm(emptyWarehouse)
    setWarehouseOpen(true)
  }

  function editWarehouse(row: Warehouse) {
    setError('')
    setMessage('')
    setWarehouseForm(toWarehouseForm(row))
    setWarehouseOpen(true)
  }

  function addLocation() {
    setError('')
    setMessage('')
    setLocationForm({ ...emptyLocation, warehouse_id: selected })
    setLocationOpen(true)
  }

  function editLocation(row: Location) {
    setError('')
    setMessage('')
    setLocationForm(toLocationForm(row))
    setLocationOpen(true)
  }

  async function saveWarehouse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')

    const payload = {
      code: warehouseForm.code.trim().toUpperCase(),
      name: warehouseForm.name.trim(),
      description: warehouseForm.description.trim() || null,
      address: warehouseForm.address.trim() || null,
      active: warehouseForm.active,
      updated_at: new Date().toISOString(),
    }

    const result = warehouseForm.id
      ? await supabase.from('warehouses').update(payload).eq('id', warehouseForm.id)
      : await supabase.from('warehouses').insert(payload)

    if (result.error) {
      setError(result.error.message)
    } else {
      setMessage('บันทึกคลังสินค้าแล้ว')
      setWarehouseOpen(false)
      await load()
    }
    setBusy(false)
  }

  async function saveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')

    const payload = {
      warehouse_id: locationForm.warehouse_id,
      code: locationForm.code.trim().toUpperCase(),
      name: locationForm.name.trim(),
      zone: locationForm.zone.trim() || null,
      default_condition: locationForm.default_condition,
      notes: locationForm.notes.trim() || null,
      active: locationForm.active,
      updated_at: new Date().toISOString(),
    }

    if (locationForm.id) {
      const { error: updateError } = await supabase
        .from('locations')
        .update({
          ...payload,
          scan_code: locationForm.scan_code.trim() || `LOC:${locationForm.id}`,
        })
        .eq('id', locationForm.id)

      if (updateError) setError(updateError.message)
      else {
        setMessage('บันทึกโลเคชั่นแล้ว')
        setLocationOpen(false)
        await load()
      }
    } else {
      const { data, error: insertError } = await supabase
        .from('locations')
        .insert(payload)
        .select('id')
        .single()

      if (insertError) {
        setError(insertError.message)
      } else if (!data?.id) {
        setError('สร้างโลเคชั่นสำเร็จแต่ไม่พบรหัสรายการ กรุณารีเฟรชและตรวจสอบอีกครั้ง')
      } else {
        const { error: scanCodeError } = await supabase
          .from('locations')
          .update({ scan_code: `LOC:${data.id}` })
          .eq('id', data.id)

        if (scanCodeError) setError(scanCodeError.message)
        else {
          setMessage('สร้างโลเคชั่นและรหัสสแกนแล้ว')
          setLocationOpen(false)
          await load()
        }
      }
    }
    setBusy(false)
  }

  const currentWarehouse = warehouses.find((row) => row.id === selected)
  const currentLocations = locations.filter((row) => row.warehouse_id === selected)

  function printQr() {
    const content = document.getElementById('location-qr-print')?.innerHTML
    if (!content) return
    const printWindow = window.open('', '_blank', 'width=520,height=650')
    if (!printWindow) return
    printWindow.document.write(
      `<html><head><title>Location QR</title><style>body{font-family:Arial,sans-serif;display:grid;place-items:center;padding:30px;text-align:center}svg{max-width:260px}h2{margin:12px 0 4px}.muted{color:#667085}code{display:block;margin-top:8px;font-size:11px}</style></head><body><div>${content}</div><script>window.onload=()=>window.print()<\/script></body></html>`,
    )
    printWindow.document.close()
  }

  return (
    <Protected>
      <div className="page-head">
        <div>
          <h1>คลังและโลเคชั่น</h1>
          <p>แยกพื้นที่จัดเก็บ เช่น ของปกติ กล่องบุบ เคลม รอตรวจสอบ และพื้นที่อื่น</p>
        </div>
        {canManage && (
          <div className="actions">
            <button className="btn outline" onClick={addWarehouse}>
              <Building2 size={15}/>เพิ่มคลัง
            </button>
            <button className="btn primary" onClick={addLocation} disabled={!selected}>
              <Plus size={15}/>เพิ่มโลเคชั่น
            </button>
          </div>
        )}
      </div>

      {error && <div className="error-box" style={{ marginBottom: 12 }}>{error}</div>}
      {message && <div className="success-box" style={{ marginBottom: 12 }}>{message}</div>}

      <div className="split-layout">
        <div className="card">
          <div className="card-title"><h2>โครงสร้างคลัง</h2><span className="badge">{warehouses.length} คลัง</span></div>
          <div className="warehouse-list">
            {warehouses.map((warehouse) => (
              <div
                key={warehouse.id}
                className={`warehouse-card ${selected === warehouse.id ? 'active' : ''}`}
                onClick={() => setSelected(warehouse.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="location-code"><Building2 size={16}/></div>
                  <div style={{ flex: 1 }}>
                    <h3>{warehouse.code} · {warehouse.name}</h3>
                    <p>{locations.filter((row) => row.warehouse_id === warehouse.id).length} โลเคชั่น · {warehouse.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</p>
                  </div>
                  {canManage && (
                    <button
                      className="icon-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        editWarehouse(warehouse)
                      }}
                    >
                      <Edit3 size={14}/>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <div>
              <h2>{currentWarehouse ? `${currentWarehouse.code} · ${currentWarehouse.name}` : 'เลือกคลังสินค้า'}</h2>
              {currentWarehouse && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{currentWarehouse.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</div>}
            </div>
            <MapPin size={18} className="muted"/>
          </div>

          {currentLocations.length ? currentLocations.map((location) => (
            <div className="location-row" key={location.id}>
              <div className="location-code">{location.code}</div>
              <div className="location-copy">
                <strong>{location.name}</strong>
                <span>{location.zone ? `โซน ${location.zone} · ` : ''}{conditionLabel(location.default_condition)} · {location.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
              </div>
              <span className="badge dark">{conditionLabel(location.default_condition)}</span>
              <button className="icon-button" title="QR Code" onClick={() => setQrLocation(location)}><QrCode size={14}/></button>
              {canManage && <button className="icon-button" title="แก้ไข" onClick={() => editLocation(location)}><Edit3 size={14}/></button>}
            </div>
          )) : <div className="empty">คลังนี้ยังไม่มีโลเคชั่น</div>}
        </div>
      </div>

      {warehouseOpen && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={saveWarehouse}>
            <div className="modal-header">
              <h2>{warehouseForm.id ? 'แก้ไขคลังสินค้า' : 'เพิ่มคลังสินค้า'}</h2>
              <button type="button" className="icon-button" onClick={() => setWarehouseOpen(false)}><X size={18}/></button>
            </div>
            <div className="form-grid">
              <div className="field"><label>รหัสคลัง *</label><input value={warehouseForm.code} onChange={(event) => setWarehouseForm({ ...warehouseForm, code: event.target.value })} required/></div>
              <div className="field"><label>ชื่อคลัง *</label><input value={warehouseForm.name} onChange={(event) => setWarehouseForm({ ...warehouseForm, name: event.target.value })} required/></div>
              <div className="field full"><label>รายละเอียด</label><textarea value={warehouseForm.description} onChange={(event) => setWarehouseForm({ ...warehouseForm, description: event.target.value })}/></div>
              <div className="field full"><label>ที่อยู่ / จุดสังเกต</label><textarea value={warehouseForm.address} onChange={(event) => setWarehouseForm({ ...warehouseForm, address: event.target.value })}/></div>
              <label className="checkbox full"><input type="checkbox" checked={warehouseForm.active} onChange={(event) => setWarehouseForm({ ...warehouseForm, active: event.target.checked })}/>เปิดใช้งานคลัง</label>
            </div>
            <div className="modal-footer"><button type="button" className="btn outline" onClick={() => setWarehouseOpen(false)}>ยกเลิก</button><button className="btn primary" disabled={busy}>บันทึก</button></div>
          </form>
        </div>
      )}

      {locationOpen && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={saveLocation}>
            <div className="modal-header"><h2>{locationForm.id ? 'แก้ไขโลเคชั่น' : 'เพิ่มโลเคชั่น'}</h2><button type="button" className="icon-button" onClick={() => setLocationOpen(false)}><X size={18}/></button></div>
            <div className="form-grid">
              <div className="field full"><label>คลังสินค้า *</label><select value={locationForm.warehouse_id} onChange={(event) => setLocationForm({ ...locationForm, warehouse_id: event.target.value })}>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} · {warehouse.name}</option>)}</select></div>
              <div className="field"><label>รหัสโลเคชั่น *</label><input value={locationForm.code} onChange={(event) => setLocationForm({ ...locationForm, code: event.target.value })} placeholder="เช่น A-01" required/></div>
              <div className="field"><label>ชื่อโลเคชั่น *</label><input value={locationForm.name} onChange={(event) => setLocationForm({ ...locationForm, name: event.target.value })} placeholder="เช่น ของปกติ" required/></div>
              <div className="field"><label>โซน / ชั้นวาง</label><input value={locationForm.zone} onChange={(event) => setLocationForm({ ...locationForm, zone: event.target.value })}/></div>
              <div className="field"><label>สภาพสินค้าเริ่มต้น</label><select value={locationForm.default_condition} onChange={(event) => setLocationForm({ ...locationForm, default_condition: event.target.value as StockCondition })}>{conditionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
              {locationForm.id && <div className="field full"><label>รหัสสแกนโลเคชั่น</label><input value={locationForm.scan_code} onChange={(event) => setLocationForm({ ...locationForm, scan_code: event.target.value })}/></div>}
              <div className="field full"><label>หมายเหตุ</label><textarea value={locationForm.notes} onChange={(event) => setLocationForm({ ...locationForm, notes: event.target.value })}/></div>
              <label className="checkbox full"><input type="checkbox" checked={locationForm.active} onChange={(event) => setLocationForm({ ...locationForm, active: event.target.checked })}/>เปิดใช้งานโลเคชั่น</label>
            </div>
            <div className="modal-footer"><button type="button" className="btn outline" onClick={() => setLocationOpen(false)}>ยกเลิก</button><button className="btn primary" disabled={busy}>บันทึก</button></div>
          </form>
        </div>
      )}

      {qrLocation && (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: 'min(460px,100%)' }}>
            <div className="modal-header"><h2>QR Code โลเคชั่น</h2><button className="icon-button" onClick={() => setQrLocation(null)}><X size={18}/></button></div>
            <div className="qr-box" id="location-qr-print">
              <QRCodeSVG value={qrLocation.scan_code || `LOC:${qrLocation.id}`} size={220} level="M" includeMargin/>
              <h2 style={{ margin: '12px 0 3px' }}>{qrLocation.code} · {qrLocation.name}</h2>
              <div className="muted">{qrLocation.warehouses?.name || currentWarehouse?.name || '-'} · {conditionLabel(qrLocation.default_condition)}</div>
              <code style={{ marginTop: 8, fontSize: 10 }}>{qrLocation.scan_code || `LOC:${qrLocation.id}`}</code>
            </div>
            <div className="modal-footer"><button className="btn outline" onClick={() => setQrLocation(null)}>ปิด</button><button className="btn primary" onClick={printQr}><Printer size={15}/>พิมพ์ QR Code</button></div>
          </div>
        </div>
      )}
    </Protected>
  )
}
