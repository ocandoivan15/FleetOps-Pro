import { useState, useEffect } from 'react'
import { getFleet, getFleetStats, getMaintenance, createVehicle, updateVehicle, deleteVehicle, getVehicle, sendToTaller, toggleChecklistItem } from '../api'
import Modal from '../components/Modal'
import DropdownMenu from '../components/DropdownMenu'

export default function FleetManagement() {
  const [assets, setAssets] = useState([])
  const [fleetStats, setFleetStats] = useState({ total: 0, active: 0, maintenance: 0, inactive: 0, avg_fuel_efficiency: 0 })
  const [maintenance, setMaintenance] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAsset, setEditingAsset] = useState(null)
  const [form, setForm] = useState({ vehicle_id: '', plate: '', model: '', year: '', type: 'bus', km: '', capacity: '40' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showDetail, setShowDetail] = useState(false)
  const [detailVehicle, setDetailVehicle] = useState(null)
  const [detailMaint, setDetailMaint] = useState([])
  const [detailTrips, setDetailTrips] = useState([])
  const [detailTab, setDetailTab] = useState('taller')
  const [showTallerModal, setShowTallerModal] = useState(false)
  const [tallerVehicle, setTallerVehicle] = useState(null)
  const [tallerItems, setTallerItems] = useState([])
  const [tallerReason, setTallerReason] = useState('')
  const [tallerExplanation, setTallerExplanation] = useState('')
  const [tallerType, setTallerType] = useState('mantenimiento')
  const [tallerKm, setTallerKm] = useState('')
  const TALLER_CHECKLIST = ['Frenos', 'Motor', 'Neumáticos', 'Luces', 'Dirección', 'Suspensión', 'Sistema Eléctrico', 'Refrigeración', 'Transmisión', 'Emisiones']

  const loadData = async () => {
    try {
      const [assetsRes, statsRes, maintRes] = await Promise.all([
        getFleet({ limit: 50 }),
        getFleetStats(),
        getMaintenance(),
      ])
      setAssets(assetsRes.data || [])
      setFleetStats(statsRes)
      setMaintenance(maintRes)
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const openCreate = () => {
    setEditingAsset(null)
    setForm({ vehicle_id: '', plate: '', model: '', year: '', type: 'bus', km: '', capacity: '40' })
    setError('')
    setShowModal(true)
  }

  const openEdit = (v) => {
    setEditingAsset(v)
    setForm({ vehicle_id: v.vehicle_id, plate: v.plate, model: v.model, year: String(v.year || ''), type: v.type || 'bus', km: String(v.km ?? ''), capacity: String(v.capacity ?? '40') })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setError('')
    if (!form.vehicle_id || !form.plate || !form.model) { setError('ID, placa y modelo son obligatorios'); return }
    setSaving(true)
    try {
      if (editingAsset) {
        await updateVehicle(editingAsset.id, form)
      } else {
        await createVehicle(form)
      }
      setShowModal(false)
      setError('')
      setForm({ vehicle_id: '', plate: '', model: '', year: '', type: 'bus', km: '', capacity: '40' })
      setEditingAsset(null)
      loadData()
    } catch (e) {
      console.error('Error:', e)
      setError(e.message || 'Error al guardar vehículo')
    } finally {
      setSaving(false)
    }
  }

  const openSendToTaller = (v) => {
    setTallerVehicle(v)
    setTallerItems(TALLER_CHECKLIST.map(item => ({ item, checked: false })))
    setTallerReason('')
    setTallerExplanation('')
    setTallerType('mantenimiento')
    setTallerKm('')
    setShowTallerModal(true)
  }

  const handleSendToTaller = async () => {
    const selected = tallerItems.filter(i => i.checked).map(i => i.item)
    try {
      await sendToTaller(tallerVehicle.id, selected, tallerReason, tallerExplanation, tallerType, tallerKm ? Number(tallerKm) : null)
      setShowTallerModal(false)
      loadData()
    } catch (e) {
      console.error(e)
      alert('Error al enviar al taller')
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      await updateVehicle(id, { status })
      loadData()
    } catch (e) { console.error(e) }
  }

  const handleToggleChecklist = async (maintId, itemId, checked) => {
    try {
      await toggleChecklistItem(maintId, itemId, checked)
    } catch (e) { console.error(e) }
  }

  const openDetail = async (v) => {
    try {
      const data = await getVehicle(v.id)
      setDetailVehicle(data)
      setDetailMaint(data.maintenance || [])
      setDetailTrips(data.trips || [])
      setDetailTab('taller')
      setShowDetail(true)
    } catch (e) { console.error(e) }
  }

  const priorityInfo = (p) => {
    const map = { high: { label: 'Alta', class: 'bg-error/10 text-error' }, critical: { label: 'Crítica', class: 'bg-red-100 text-red-800' }, medium: { label: 'Media', class: 'bg-amber-50 text-amber-700' }, low: { label: 'Baja', class: 'bg-green-50 text-green-700' } }
    return map[p] || { label: p, class: 'bg-surface-container text-on-surface-variant' }
  }

  const dropdownItems = (v) => [
    { label: 'Ver Detalles', icon: 'visibility', onClick: () => openDetail(v) },
    { label: 'Marcar Activo', icon: 'check_circle', onClick: () => handleStatusChange(v.id, 'active') },
    { label: 'Enviar al Taller', icon: 'build', onClick: () => openSendToTaller(v) },
    { label: 'Editar', icon: 'edit', onClick: () => openEdit(v) },
    { divider: true },
    { label: 'Dar de Baja', icon: 'cancel', onClick: () => handleStatusChange(v.id, 'out_of_service'), danger: true },
  ]

  const priorityIcon = (p) => {
    if (p === 'high' || p === 'critical') return { icon: 'warning', class: 'bg-error/10 text-error' }
    return { icon: 'event', class: 'bg-surface-container-high text-on-surface-variant' }
  }

  return (
    <>
      <div className="pb-stack-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-stack-md mb-stack-lg">
          <div>
            <h3 className="font-headline-lg text-headline-lg text-primary">Activos de Flota</h3>
            <p className="text-body-md text-on-surface-variant">Monitorear y gestionar {fleetStats.total || 0} unidades de tránsito activas</p>
          </div>
          <div className="flex gap-stack-sm">
            <button className="flex items-center gap-unit bg-surface-container-low text-on-surface font-semibold px-4 py-2 rounded-lg hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filtrar
            </button>
            <button onClick={openCreate} className="flex items-center gap-unit bg-secondary text-on-secondary font-semibold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-sm">add</span>
              Agregar Bus
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-lg">
          {[
            { label: 'Activos Ahora', icon: 'check_circle', iconClass: 'text-secondary', value: String(fleetStats.active || 0), sub: `${fleetStats.total ? Math.round((fleetStats.active / fleetStats.total) * 100) : 0}% de la flota`, subClass: 'text-secondary font-medium' },
            { label: 'En Taller', icon: 'build', iconClass: 'text-error', value: String(fleetStats.maintenance || 0), sub: `${fleetStats.maintenance ? Math.round((fleetStats.maintenance / fleetStats.total) * 100) : 0}% de la flota` },
            { label: 'Unidades Inactivas', icon: 'pause_circle', iconClass: 'text-outline', value: String(fleetStats.inactive || 0), sub: 'Listas para despachar' },
            { label: 'Eficiencia Combustible', icon: 'local_gas_station', iconClass: 'text-primary', value: String(fleetStats.avg_fuel_efficiency || 0), sub: 'MPG promedio flota', subClass: 'text-on-surface-variant' },
          ].map(s => (
            <div key={s.label} className="bg-surface-container-lowest p-stack-md rounded-xl border border-outline-variant">
              <div className="flex justify-between items-start mb-2">
                <span className="text-label-md uppercase tracking-wider text-on-surface-variant">{s.label}</span>
                <span className={`material-symbols-outlined ${s.iconClass}`}>{s.icon}</span>
              </div>
              <div className="text-display-lg font-display-lg text-primary leading-none">{s.value}</div>
              <div className={`text-body-sm mt-1 ${s.subClass || 'text-on-surface-variant'}`}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-8">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
              <div className="p-gutter border-b border-outline-variant bg-surface-container-low/30">
                <h4 className="font-headline-md text-headline-md text-primary">Resumen de Activos</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/50">
                      <th className="p-4 text-label-md text-on-surface-variant uppercase tracking-wider">Bus ID / Placa</th>
                      <th className="p-4 text-label-md text-on-surface-variant uppercase tracking-wider">Modelo</th>
                      <th className="p-4 text-label-md text-on-surface-variant uppercase tracking-wider text-right">Km</th>
                      <th className="p-4 text-label-md text-on-surface-variant uppercase tracking-wider text-right">Cap.</th>
                      <th className="p-4 text-label-md text-on-surface-variant uppercase tracking-wider">Estado</th>
                      <th className="p-4 text-label-md text-on-surface-variant uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {loading ? (
                      <tr><td colSpan={6} className="text-center py-8 text-on-surface-variant">Cargando...</td></tr>
                    ) : assets.map(a => (
                      <tr key={a.id} className="hover:bg-surface-container-low transition-colors duration-200">
                        <td className="p-4">
                          <div className="font-bold text-primary">{a.vehicle_id}</div>
                          <div className="text-body-sm text-on-surface-variant">{a.plate}</div>
                        </td>
                        <td className="p-4 text-body-md text-on-surface">{a.model}</td>
                        <td className="p-4 text-right text-body-md text-on-surface font-bold">{a.km != null ? `${Number(a.km).toLocaleString()} km` : '—'}</td>
                        <td className="p-4 text-right text-body-md text-on-surface font-bold">{a.capacity || '—'}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-unit px-3 py-1 rounded-full text-label-md font-bold uppercase ${a.statusInfo?.class || ''}`}>
                            <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>{a.statusInfo?.icon || 'help'}</span>
                            {a.statusInfo?.label || a.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <DropdownMenu
                            trigger={<span className="material-symbols-outlined text-secondary hover:text-secondary/80 transition-colors cursor-pointer">more_vert</span>}
                            items={dropdownItems(a)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-gutter">
            <div className="bg-primary text-on-primary p-gutter rounded-xl shadow-lg">
              <div className="flex items-center gap-stack-sm mb-stack-md">
                <span className="material-symbols-outlined">assignment_ind</span>
                <h5 className="font-headline-md text-headline-md">Despacho Rápido</h5>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-label-md text-on-primary-container block mb-1">Seleccionar Bus</label>
                  <select className="w-full bg-surface-container-lowest text-primary rounded-lg border-none focus:ring-2 focus:ring-secondary/50 text-body-sm px-3 py-2">
                    <option>BUS-0992 (Disponible)</option>
                    <option>BUS-0431 (Disponible)</option>
                    <option>BUS-1201 (Disponible)</option>
                  </select>
                </div>
                <div>
                  <label className="text-label-md text-on-primary-container block mb-1">Asignar Conductor</label>
                  <select className="w-full bg-surface-container-lowest text-primary rounded-lg border-none focus:ring-2 focus:ring-secondary/50 text-body-sm px-3 py-2">
                    <option>Roberto Chen (Turno A)</option>
                    <option>Sarah Jenkins (Turno B)</option>
                    <option>Michael Scott (Disponible)</option>
                  </select>
                </div>
                <button className="w-full bg-secondary text-on-secondary py-3 rounded-lg font-bold hover:opacity-90 transition-opacity">Desplegar Unidad</button>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter">
              <h5 className="font-headline-md text-headline-md text-primary mb-stack-md">Próximos Mantenimientos</h5>
              <div className="space-y-stack-md">
                {maintenance.length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant text-center py-4">Sin mantenimientos programados</p>
                ) : maintenance.slice(0, 3).map(m => {
                  const p = priorityIcon(m.priority)
                  return (
                    <div key={m.id} className="flex items-start gap-stack-sm p-stack-sm rounded-lg bg-surface-container">
                      <div className={`${p.class} p-2 rounded-lg`}>
                        <span className="material-symbols-outlined">{p.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-body-md font-bold text-primary">{m.v_id || 'BUS-?'} - {m.description}</div>
                        <p className="text-body-sm text-on-surface-variant">{m.scheduled_date || 'Por definir'}</p>
                        <div className="mt-2 flex gap-stack-sm">
                          <button className="text-label-md text-secondary font-bold hover:underline">Ver Registros</button>
                          <button className="text-label-md text-error font-bold hover:underline">Posponer</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button className="w-full mt-stack-md text-secondary font-bold text-body-sm border border-secondary/20 py-2 rounded-lg hover:bg-secondary/5 transition-colors">Calendario Completo</button>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden h-64 relative group">
              <div className="w-full h-full bg-surface-container flex items-center justify-center">
                <div className="text-center">
                  <span className="material-symbols-outlined text-[48px] text-secondary">map</span>
                  <p className="font-bold text-body-lg text-primary mt-2">Distrito Central en Vivo</p>
                  <p className="text-body-sm text-on-surface-variant">{fleetStats.active || 0} unidades en tránsito</p>
                </div>
              </div>
              <button className="absolute top-4 right-4 bg-surface-container-lowest/90 backdrop-blur-sm p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-primary">fullscreen</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Enviar al Taller - Checklist */}
      <Modal open={showTallerModal} onClose={() => setShowTallerModal(false)} title={`Enviar al Taller - ${tallerVehicle?.vehicle_id || ''}`}>
        <div className="space-y-stack-md">
          <div>
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Razón *</label>
            <input value={tallerReason} onChange={e => setTallerReason(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="Ej: Mantención programada, Falla mecánica, etc." />
          </div>
          <div>
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Kilometraje</label>
            <input type="number" value={tallerKm} onChange={e => setTallerKm(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="Ej: 45230" min="0" />
          </div>
          <div>
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Explicación breve</label>
            <textarea value={tallerExplanation} onChange={e => setTallerExplanation(e.target.value)} rows={2} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none resize-none" placeholder="Ej: El motor presenta ruidos extraños al arrancar" />
          </div>
          <div className="border-t border-outline-variant pt-stack-md">
            <p className="text-label-md text-on-surface-variant uppercase tracking-wider mb-2">Tipo</p>
            <div className="flex gap-4 mb-stack-md">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="tallerType" value="mantenimiento" checked={tallerType === 'mantenimiento'} onChange={() => setTallerType('mantenimiento')} className="w-4 h-4 text-secondary focus:ring-secondary/30" />
                <span className="flex items-center gap-1.5 text-body-md"><span className="material-symbols-outlined text-[18px] text-secondary">build</span> Mantenimiento</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="tallerType" value="reparacion" checked={tallerType === 'reparacion'} onChange={() => setTallerType('reparacion')} className="w-4 h-4 text-error focus:ring-error/30" />
                <span className="flex items-center gap-1.5 text-body-md"><span className="material-symbols-outlined text-[18px] text-error">handyman</span> Reparación</span>
              </label>
            </div>
            <p className="text-body-sm text-on-surface-variant mb-3">Seleccioná los items a revisar:</p>
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {tallerItems.map((ti, i) => (
                <label key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-container-low cursor-pointer transition-colors border border-outline-variant">
                  <input
                    type="checkbox"
                    checked={ti.checked}
                    onChange={() => setTallerItems(prev => prev.map((t, idx) => idx === i ? { ...t, checked: !t.checked } : t))}
                    className="w-5 h-5 rounded border-outline-variant text-secondary focus:ring-secondary/30"
                  />
                  <span className="text-body-md text-on-surface">{ti.item}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-stack-sm pt-stack-md border-t border-outline-variant">
              <button onClick={() => setShowTallerModal(false)} className="px-gutter py-stack-sm border border-outline-variant rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors">Cancelar</button>
              <button onClick={handleSendToTaller} className="px-gutter py-stack-sm bg-error text-on-error rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">build</span>
                Enviar a Taller
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Detalle del Vehículo */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={detailVehicle?.vehicle_id || 'Detalle del Vehículo'} wide>
        {detailVehicle && (
          <div className="space-y-stack-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-secondary-container/20 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[28px]">directions_bus</span>
                  </div>
                  <div>
                    <h4 className="font-headline-md text-primary">{detailVehicle.vehicle_id} · {detailVehicle.plate}</h4>
                    <p className="text-body-sm text-on-surface-variant">{detailVehicle.model} ({detailVehicle.year || '—'})</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-surface-container-low rounded-lg p-3">
                    <p className="text-label-md text-on-surface-variant uppercase">Tipo</p>
                    <p className="font-bold text-primary capitalize">{detailVehicle.type || 'bus'}</p>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3">
                    <p className="text-label-md text-on-surface-variant uppercase">Kilometraje</p>
                    <p className="font-bold text-primary">{detailVehicle.km != null ? `${Number(detailVehicle.km).toLocaleString()} km` : '—'}</p>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3">
                    <p className="text-label-md text-on-surface-variant uppercase">Estado</p>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-label-md font-bold mt-1 ${detailVehicle.status === 'active' ? 'bg-secondary/10 text-secondary' : detailVehicle.status === 'maintenance' ? 'bg-error/10 text-error' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                      <span className="material-symbols-outlined text-[14px]">{detailVehicle.status === 'active' ? 'check_circle' : detailVehicle.status === 'maintenance' ? 'build' : 'cancel'}</span>
                      {detailVehicle.status === 'active' ? 'Activo' : detailVehicle.status === 'maintenance' ? 'En Taller' : 'Inactivo'}
                    </div>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3">
                    <p className="text-label-md text-on-surface-variant uppercase">Eficiencia</p>
                    <p className="font-bold text-primary">{detailVehicle.fuel_efficiency || '—'} MPG</p>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3">
                    <p className="text-label-md text-on-surface-variant uppercase">Capacidad</p>
                    <p className="font-bold text-primary">{detailVehicle.capacity || '—'} pasajeros</p>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3">
                    <p className="text-label-md text-on-surface-variant uppercase">Viajes</p>
                    <p className="font-bold text-primary">—</p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-low rounded-xl p-4">
                <div className="flex gap-1 mb-4 bg-surface-container-highest rounded-lg p-1">
                  <button onClick={() => setDetailTab('taller')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-label-md font-bold transition-all ${detailTab === 'taller' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}>
                    <span className="material-symbols-outlined text-[16px]">build</span>
                    Taller
                  </button>
                  <button onClick={() => setDetailTab('viajes')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-label-md font-bold transition-all ${detailTab === 'viajes' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}>
                    <span className="material-symbols-outlined text-[16px]">route</span>
                    Viajes
                  </button>
                </div>

                {detailTab === 'taller' ? (
                  <>
                    {detailMaint.length === 0 ? (
                      <div className="text-center py-6">
                        <span className="material-symbols-outlined text-[36px] text-outline">check_circle</span>
                        <p className="text-body-sm text-on-surface-variant mt-2">Sin registros de taller</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[320px] overflow-y-auto">
                        {detailMaint.map(m => {
                          const p = priorityInfo(m.priority)
                          const items = m.checklist || []
                          return (
                            <div key={m.id} className={`bg-surface-container-lowest rounded-lg p-3 border-l-4 ${m.priority === 'high' || m.priority === 'critical' ? 'border-error' : 'border-secondary'}`}>
                              <div className="flex items-start justify-between mb-1 gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {m.description?.startsWith('[Reparación]') ? (
                                    <span className="inline-flex items-center gap-1 text-label-md px-1.5 py-0.5 rounded bg-error/10 text-error font-bold">Reparación</span>
                                  ) : m.description?.startsWith('[Mantenimiento]') ? (
                                    <span className="inline-flex items-center gap-1 text-label-md px-1.5 py-0.5 rounded bg-secondary/10 text-secondary font-bold">Mantenimiento</span>
                                  ) : null}
                                  <p className="font-bold text-body-sm text-primary">{m.description?.replace(/^\[(Reparación|Mantenimiento)\] /, '')}</p>
                                </div>
                                <span className={`shrink-0 text-label-md px-2 py-0.5 rounded-full font-bold ${p.class}`}>{p.label}</span>
                              </div>
                              <p className="text-body-sm text-on-surface-variant">{m.scheduled_date || 'Por definir'}{m.km ? ` · ${Number(m.km).toLocaleString()} km` : ''}</p>
                              <span className={`inline-flex items-center text-label-md font-bold mt-1 ${m.status === 'completed' ? 'text-green-600' : m.status === 'in_progress' ? 'text-secondary' : 'text-amber-600'}`}>
                                <span className="material-symbols-outlined text-[14px] mr-1">{m.status === 'completed' ? 'check_circle' : m.status === 'in_progress' ? 'sync' : 'schedule'}</span>
                                {m.status === 'completed' ? 'Completado' : m.status === 'in_progress' ? 'En Progreso' : 'Pendiente'}
                              </span>
                              {items.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-outline-variant/50 space-y-1">
                                  {items.map(ci => (
                                    <div key={ci.id} className="flex items-center gap-2 text-body-sm">
                                      <span className={`material-symbols-outlined text-[16px] ${ci.checked ? 'text-green-600' : 'text-outline'}`}>
                                        {ci.checked ? 'check_circle' : 'radio_button_unchecked'}
                                      </span>
                                      <span className={ci.checked ? 'text-on-surface line-through opacity-60' : 'text-on-surface-variant'}>{ci.item}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {detailTrips.length === 0 ? (
                      <div className="text-center py-6">
                        <span className="material-symbols-outlined text-[36px] text-outline">route</span>
                        <p className="text-body-sm text-on-surface-variant mt-2">Sin viajes registrados</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[320px] overflow-y-auto">
                        {detailTrips.map(t => (
                          <div key={t.id} className="bg-surface-container-lowest rounded-lg p-3 border border-outline-variant">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-bold text-body-sm text-primary">{t.trip_id}</p>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-label-md font-bold ${t.status === 'completed' ? 'text-green-600 bg-green-50' : t.status === 'in_progress' ? 'text-secondary bg-secondary/10' : t.status === 'delayed' ? 'text-error bg-error/10' : 'text-amber-600 bg-amber-50'}`}>
                                <span className="material-symbols-outlined text-[12px]">{t.status === 'completed' ? 'check_circle' : t.status === 'in_progress' ? 'sync' : t.status === 'delayed' ? 'error' : 'schedule'}</span>
                                {t.status === 'completed' ? 'Completado' : t.status === 'in_progress' ? 'En Curso' : t.status === 'delayed' ? 'Demorado' : 'Pendiente'}
                              </span>
                            </div>
                            <p className="text-body-sm text-on-surface-variant">{t.route_name} · {t.driver_name || 'Sin conductor'}{t.client_name ? ` · ${t.client_name}` : ''}</p>
                            <p className="text-body-xs text-on-surface-variant mt-1">{t.scheduled_time || '—'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditingAsset(null) }} title={editingAsset ? 'Editar Bus' : 'Agregar Nuevo Bus'}>
        <div className="space-y-stack-md">
          <div className="grid grid-cols-2 gap-stack-md">
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">ID del Bus</label>
              <input value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="BUS-XXXX" />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Placa</label>
              <input value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="ABC-1234" />
            </div>
          </div>
          <div>
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Modelo</label>
            <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="Volvo 7900 Hybrid" />
          </div>
          <div className="grid grid-cols-2 gap-stack-md">
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Año</label>
              <input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" type="number" placeholder="2024" />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Km</label>
              <input value={form.km} onChange={e => setForm({ ...form, km: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" type="number" min="0" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-stack-md">
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Tipo</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none">
                <option value="bus">Autobús</option>
                <option value="electric">Eléctrico</option>
                <option value="van">Van</option>
              </select>
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Capacidad</label>
              <input value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" type="number" min="1" placeholder="40" />
            </div>
          </div>
          {error && <div className="bg-error-container text-error px-4 py-2.5 rounded-lg text-body-sm font-medium">{error}</div>}
          <div className="flex justify-end gap-stack-sm pt-stack-md border-t border-outline-variant">
            <button onClick={() => { setShowModal(false); setEditingAsset(null) }} className="px-gutter py-stack-sm border border-outline-variant rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-gutter py-stack-sm bg-secondary text-on-secondary rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Guardando...' : editingAsset ? 'Guardar Cambios' : 'Agregar Bus'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
