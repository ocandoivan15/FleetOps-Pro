import { useState, useEffect } from 'react'
import { getDrivers, getDriverStats, createDriver, updateDriver, deleteDriver, getUnassignedTrips, assignDriverToTrip } from '../api'
import Modal from '../components/Modal'
import DropdownMenu from '../components/DropdownMenu'

export default function DriverManagement() {
  const [drivers, setDrivers] = useState([])
  const [driverStats, setDriverStats] = useState({ total: 0, on_duty: 0, rest: 0, critical: 0 })
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingDriver, setEditingDriver] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', license: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [assignTripDriver, setAssignTripDriver] = useState(null)
  const [unassignedTrips, setUnassignedTrips] = useState([])
  const [assignTripId, setAssignTripId] = useState('')
  const [error, setError] = useState('')

  const handleAssignTrip = async () => {
    if (!assignTripDriver || !assignTripId) return
    try {
      await assignDriverToTrip(assignTripId, assignTripDriver.id)
      setAssignTripDriver(null)
      setAssignTripId('')
      loadData(page)
    } catch (e) { console.error(e) }
  }

  const loadData = async (p = page) => {
    try {
      const [driversRes, statsRes, tripsRes] = await Promise.all([
        getDrivers({ page: p, limit: 4 }),
        getDriverStats(),
        getUnassignedTrips(),
      ])
      setDrivers(driversRes.data || [])
      setPagination(driversRes.pagination)
      setDriverStats(statsRes)
      setUnassignedTrips(tripsRes)
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [page])

  const openCreate = () => {
    setEditingDriver(null)
    setForm({ name: '', email: '', license: '', phone: '' })
    setError('')
    setShowModal(true)
  }

  const openEdit = (d) => {
    setEditingDriver(d)
    setForm({ name: d.name, email: d.email || '', license: d.license, phone: d.phone || '' })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setError('')
    if (!form.name) { setError('El nombre es obligatorio'); return }
    if (!form.email) { setError('El email es obligatorio'); return }
    if (!form.license) { setError('La licencia es obligatoria'); return }
    setSaving(true)
    try {
      if (editingDriver) {
        await updateDriver(editingDriver.id, form)
      } else {
        await createDriver(form)
      }
      setShowModal(false)
      setError('')
      setForm({ name: '', email: '', license: '', phone: '' })
      setEditingDriver(null)
      loadData(1)
    } catch (e) {
      console.error('Error:', e)
      setError(e.message || 'Error al guardar conductor')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      await updateDriver(id, { status })
      loadData(page)
    } catch (e) { console.error(e) }
  }

  const dropdownItems = (d) => [
    { label: 'Ver Perfil', icon: 'person', onClick: () => alert(`Conductor: ${d.name}`) },
    { label: 'Asignar Viaje', icon: 'route', onClick: () => { setAssignTripDriver(d); setAssignTripId('') } },
    { label: 'Marcar en Servicio', icon: 'radio_button_checked', onClick: () => handleStatusChange(d.id, 'on_duty') },
    { label: 'Marcar Descanso', icon: 'history_toggle_off', onClick: () => handleStatusChange(d.id, 'rest') },
    { label: 'Editar', icon: 'edit', onClick: () => openEdit(d) },
    { divider: true },
    { label: 'Eliminar', icon: 'delete', danger: true, onClick: async () => {
      if (!window.confirm(`¿Eliminar a ${d.name}? Los viajes asociados quedarán sin conductor.`)) return;
      try { await deleteDriver(d.id); loadData(page) }
      catch (e) { alert('Error al eliminar conductor') }
    }},
    { divider: true },
    { label: 'Marcar Crítico', icon: 'warning', onClick: () => handleStatusChange(d.id, 'critical'), danger: true },
  ]

  return (
    <>
      <div className="pb-stack-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-stack-lg gap-gutter">
          <div>
            <h3 className="font-headline-lg text-headline-lg text-primary">Directorio de Conductores</h3>
            <p className="text-on-surface-variant">Gestionar credenciales, monitorear horas y asignar rutas activas.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-stack-sm bg-secondary text-on-secondary px-gutter py-stack-sm rounded-lg font-medium shadow-sm hover:opacity-90 transition-all active:scale-95">
            <span className="material-symbols-outlined">person_add</span>
            Registrar Nuevo Conductor
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-stack-lg">
          {[
            { label: 'Total Personal', icon: 'groups', iconClass: 'text-secondary', value: String(driverStats.total || 0), sub: '+3% respecto al mes pasado', subClass: 'text-green-600', subIcon: 'arrow_upward' },
            { label: 'En Servicio', icon: 'check_circle', iconClass: 'text-green-600', iconFill: true, value: String(driverStats.on_duty || 0), sub: 'Activos en líneas de tránsito', subClass: 'text-on-surface-variant' },
            { label: 'En Descanso', icon: 'schedule', iconClass: 'text-amber-500', iconFill: true, value: String(driverStats.rest || 0), sub: 'Cumplimiento normas seguridad', subClass: 'text-on-surface-variant' },
            { label: 'Horas Extras', icon: 'warning', iconClass: 'text-error', iconFill: true, value: String(driverStats.critical || 0), sub: 'Requiere revisión inmediata', subClass: 'text-on-surface-variant', valueClass: 'text-error' },
          ].map(s => (
            <div key={s.label} className="bg-surface-container-lowest border border-outline-variant p-stack-md rounded-xl">
              <div className="flex items-center justify-between mb-unit">
                <span className="text-label-md text-on-surface-variant uppercase">{s.label}</span>
                <span className={`material-symbols-outlined ${s.iconClass}`} style={s.iconFill ? { fontVariationSettings: "'FILL' 1" } : {}}>{s.icon}</span>
              </div>
              <p className={`font-headline-md text-headline-md font-bold ${s.valueClass || ''}`}>{s.value}</p>
              <p className={`text-body-sm flex items-center gap-unit ${s.subClass}`}>
                {s.subIcon && <span className="material-symbols-outlined text-[16px]">{s.subIcon}</span>}
                {s.sub}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          <div className="lg:col-span-2">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
              <div className="p-gutter border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
                <h4 className="font-headline-md text-headline-md text-primary">Personal Activo</h4>
                <div className="flex gap-stack-sm">
                  <button className="p-unit rounded border border-outline-variant hover:bg-surface-container transition-colors"><span className="material-symbols-outlined">filter_list</span></button>
                  <button className="p-unit rounded border border-outline-variant hover:bg-surface-container transition-colors"><span className="material-symbols-outlined">download</span></button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low/50 text-label-md text-on-surface-variant uppercase">
                    <tr>
                      <th className="p-gutter font-semibold">Conductor</th>
                      <th className="p-gutter font-semibold">Licencia No.</th>
                      <th className="p-gutter font-semibold">Horas</th>
                      <th className="p-gutter font-semibold">Estado</th>
                      <th className="p-gutter font-semibold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {loading ? (
                      <tr><td colSpan={5} className="text-center py-8 text-on-surface-variant">Cargando...</td></tr>
                    ) : drivers.map(d => (
                      <tr key={d.id} className="hover:bg-surface-container-low/20 transition-colors group">
                        <td className="p-gutter">
                          <div className="flex items-center gap-stack-md">
                            <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary font-bold">
                              {d.name ? d.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div>
                              <p className="font-body-md font-bold text-primary">{d.name}</p>
                              <p className="text-body-sm text-on-surface-variant">{d.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-gutter text-body-sm text-on-surface-variant">{d.license}</td>
                        <td className="p-gutter">
                          <p className="font-body-md">{d.total_hours || 0} <span className="text-body-sm text-on-surface-variant">hrs</span></p>
                          <div className="w-24 h-1.5 bg-surface-container-highest rounded-full mt-unit">
                            <div className={`${d.bar > 90 ? 'bg-error' : 'bg-secondary'} h-full rounded-full`} style={{ width: `${Math.min(100, d.bar || 0)}%` }} />
                          </div>
                        </td>
                        <td className="p-gutter">
                          <span className={`inline-flex items-center gap-unit px-stack-sm py-unit rounded-full text-label-md font-bold ${d.statusInfo?.class || ''}`}>
                            <span className="material-symbols-outlined text-[14px]">{d.statusInfo?.icon || 'help'}</span>
                            {d.statusInfo?.label || d.status}
                          </span>
                        </td>
                        <td className="p-gutter text-right">
                          <DropdownMenu
                            trigger={<span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer">more_vert</span>}
                            items={dropdownItems(d)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-gutter bg-surface-container-low/30 border-t border-outline-variant flex items-center justify-between">
                <span className="text-body-sm text-on-surface-variant">Mostrando {drivers.length} de {pagination.total || 0} conductores</span>
                <div className="flex gap-unit">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  {Array.from({ length: Math.max(1, pagination.pages) }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPage(n)} className={`w-8 h-8 flex items-center justify-center rounded font-bold text-body-sm ${n === page ? 'bg-secondary text-on-secondary' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container'} transition-colors`}>{n}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(pagination.pages || 1, p + 1))} disabled={page >= (pagination.pages || 1)} className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-gutter">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter">
              <div className="flex items-center gap-stack-sm mb-stack-md">
                <span className="material-symbols-outlined text-secondary">event_note</span>
                <h4 className="font-headline-md text-headline-md text-primary">Asignar Viajes</h4>
              </div>
              <div className="space-y-stack-md">
                <div className="p-stack-sm rounded-lg bg-surface-container-low border border-outline-variant">
                  <p className="text-label-md text-on-surface-variant uppercase mb-unit">Próximo Viaje</p>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-body-md font-bold">Ruta 42 - Circuito Centro</p>
                      <p className="text-body-sm text-on-surface-variant flex items-center gap-unit"><span className="material-symbols-outlined text-[14px]">alarm</span> 06:30 AM Mañana</p>
                    </div>
                    <button className="bg-secondary text-on-secondary text-label-md px-stack-sm py-unit rounded-full">Asignar</button>
                  </div>
                </div>
                <div className="p-stack-sm rounded-lg border border-dashed border-outline-variant hover:bg-surface-container transition-all cursor-pointer flex flex-col items-center py-stack-lg">
                  <span className="material-symbols-outlined text-outline mb-unit">add_circle</span>
                  <p className="text-body-sm font-medium text-on-surface-variant">Programar Asignación Manual</p>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter">
              <h4 className="font-headline-md text-headline-md text-primary mb-stack-md">Resumen de Turnos</h4>
              <div className="space-y-stack-md">
                {[
                  { label: 'Turno Mañana', fill: '92% Cubierto', fillClass: 'text-green-700', bar: 'bg-green-600', time: '05:00 - 13:00', count: `${Math.floor((driverStats.on_duty || 0) * 0.5)} Conductores` },
                  { label: 'Turno Tarde', fill: '78% Cubierto', fillClass: 'text-secondary', bar: 'bg-secondary', time: '13:00 - 21:00', count: `${Math.floor((driverStats.on_duty || 0) * 0.4)} Conductores` },
                  { label: 'Turno Noche', fill: 'Pendiente', fillClass: 'text-on-surface-variant', bar: 'bg-outline', time: '21:00 - 05:00', count: '0 Conductores', opacity: 'opacity-60' },
                ].map(s => (
                  <div key={s.label} className={`flex items-center gap-stack-md ${s.opacity || ''}`}>
                    <div className={`w-1.5 h-10 ${s.bar} rounded-full`} />
                    <div className="flex-grow">
                      <div className="flex justify-between items-center"><p className="font-body-md font-bold">{s.label}</p><span className={`text-label-md ${s.fillClass}`}>{s.fill}</span></div>
                      <p className="text-body-sm text-on-surface-variant">{s.time} • {s.count}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-stack-lg border border-outline-variant text-on-surface-variant py-stack-sm rounded-lg font-medium hover:bg-surface-container transition-colors">Ver Listados Completos</button>
            </div>
          </div>
        </div>
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditingDriver(null) }} title={editingDriver ? 'Editar Conductor' : 'Registrar Nuevo Conductor'}>
        <div className="space-y-stack-md">
          <div>
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Nombre Completo</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="Nombre del conductor" />
          </div>
          <div className="grid grid-cols-2 gap-stack-md">
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Email</label>
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" type="email" placeholder="correo@fleetops.pro" />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Licencia No.</label>
              <input value={form.license} onChange={e => setForm({ ...form, license: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="TX-000-XXXX" />
            </div>
          </div>
          <div>
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Teléfono</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="555-0000" />
          </div>
          {error && <div className="bg-error-container text-error px-4 py-2.5 rounded-lg text-body-sm font-medium">{error}</div>}
          <div className="flex justify-end gap-stack-sm pt-stack-md border-t border-outline-variant">
            <button onClick={() => { setShowModal(false); setEditingDriver(null) }} className="px-gutter py-stack-sm border border-outline-variant rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-gutter py-stack-sm bg-secondary text-on-secondary rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Guardando...' : editingDriver ? 'Guardar Cambios' : 'Registrar Conductor'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Asignar Viaje a Conductor */}
      <Modal open={!!assignTripDriver} onClose={() => setAssignTripDriver(null)} title={`Asignar Viaje - ${assignTripDriver?.name || ''}`}>
        <div className="space-y-stack-md">
          <div>
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Seleccionar Viaje</label>
            <select value={assignTripId} onChange={e => setAssignTripId(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none">
              <option value="">Seleccionar viaje...</option>
              {unassignedTrips.map(t => (
                <option key={t.id} value={t.id}>{t.trip_id} - {t.route_name} {t.client_name ? `(${t.client_name})` : ''}</option>
              ))}
            </select>
            {unassignedTrips.length === 0 && (
              <p className="text-body-sm text-amber-600 mt-2">No hay viajes sin asignar disponibles.</p>
            )}
          </div>
          <div className="flex justify-end gap-stack-sm pt-stack-md border-t border-outline-variant">
            <button onClick={() => setAssignTripDriver(null)} className="px-gutter py-stack-sm border border-outline-variant rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors">Cancelar</button>
            <button onClick={handleAssignTrip} disabled={!assignTripId} className="px-gutter py-stack-sm bg-secondary text-on-secondary rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50">Asignar Viaje</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
