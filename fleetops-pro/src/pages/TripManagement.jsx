import { useState, useEffect, useRef } from 'react'
import { getTrips, createTrip, updateTrip, getClients, getAvailableDrivers, getFleet, assignDriverToTrip, createClient, getTripStats, getFleetStats, getDriverStats } from '../api'
import Modal from '../components/Modal'
import DropdownMenu from '../components/DropdownMenu'
import FleetMap from '../components/FleetMap'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const MARACAIBO = [10.6544, -71.6525]

const tripTypeOptions = [
  { value: 'one_way', label: 'Ida', icon: 'arrow_forward' },
  { value: 'round_trip', label: 'Ida y Vuelta', icon: 'swap_horiz' },
  { value: 'multi', label: 'Varios Viajes', icon: 'repeat' },
]

function TripMapPicker({ origin, setOrigin, destination, setDestination }) {
  const mapRef = useRef(null)
  const map = useRef(null)
  const originMarker = useRef(null)
  const destMarker = useRef(null)
  const initDone = useRef(false)

  useEffect(() => {
    if (initDone.current) return
    initDone.current = true

    const m = L.map(mapRef.current, { center: MARACAIBO, zoom: 13, zoomControl: false, attributionControl: false })
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(m)
    L.control.zoom({ position: 'bottomright' }).addTo(m)
    map.current = m

    m.on('click', (e) => {
      const { lat, lng } = e.latlng
      // Primer click = origen, segundo = destino
      if (!originMarker.current) {
        const mk = L.marker([lat, lng], { draggable: true }).addTo(m)
          .bindPopup('<b>Origen</b><br/>Click para nombrar')
          .openPopup()
        originMarker.current = mk
        setOrigin({ lat: lat.toFixed(6), lng: lng.toFixed(6), name: '' })
        mk.on('dragend', () => {
          const p = mk.getLatLng()
          setOrigin(prev => ({ ...prev, lat: p.lat.toFixed(6), lng: p.lng.toFixed(6) }))
        })
      } else if (!destMarker.current) {
        const mk = L.marker([lat, lng], { draggable: true }).addTo(m)
          .bindPopup('<b>Destino</b><br/>Click para nombrar')
          .openPopup()
        destMarker.current = mk
        setDestination({ lat: lat.toFixed(6), lng: lng.toFixed(6), name: '' })
        mk.on('dragend', () => {
          const p = mk.getLatLng()
          setDestination(prev => ({ ...prev, lat: p.lat.toFixed(6), lng: p.lng.toFixed(6) }))
        })
      }
    })

    return () => { m.remove(); initDone.current = false }
  }, [setOrigin, setDestination])

  useEffect(() => {
    // Update marker positions if origin changes externally
    if (originMarker.current && origin?.lat && origin?.lng) {
      originMarker.current.setLatLng([origin.lat, origin.lng])
    }
  }, [origin])

  useEffect(() => {
    if (destMarker.current && destination?.lat && destination?.lng) {
      destMarker.current.setLatLng([destination.lat, destination.lng])
    }
  }, [destination])

  return <div ref={mapRef} className="w-full h-[280px] rounded-lg" style={{ background: '#e8eaed' }} />
}

export default function TripManagement() {
  const [trips, setTrips] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState('active')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ route_name: '', route_desc: '', scheduled_time: '', origin: '', destination: '', trip_type: 'one_way', passengers: '1' })
  const [tripOrigin, setTripOrigin] = useState(null)
  const [tripDest, setTripDest] = useState(null)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', company: '' })

  // Auto-generar descripción cuando cambian origen/destino
  useEffect(() => {
    const origName = tripOrigin?.name?.trim()
    const destName = tripDest?.name?.trim()
    if (origName && destName) {
      const label = form.trip_type === 'round_trip' ? 'Ida y Vuelta' : form.trip_type === 'multi' ? 'Varios Viajes' : 'Ida'
      setForm(prev => ({ ...prev, route_desc: `${origName} → ${destName} (${label})` }))
    } else if (origName) {
      setForm(prev => ({ ...prev, route_desc: `${origName} → ...` }))
    } else {
      setForm(prev => ({ ...prev, route_desc: '' }))
    }
  }, [tripOrigin?.name, tripDest?.name, form.trip_type])
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState([])
  const [availableDrivers, setAvailableDrivers] = useState([])
  const [mapVehicles, setMapVehicles] = useState([])
  const [assignDriverTrip, setAssignDriverTrip] = useState(null)
  const [assignDriverId, setAssignDriverId] = useState('')

  // ── Salud del Sistema ──
  const [health, setHealth] = useState({ on_time_rate: 94, active_drivers: 0, total_drivers: 0, active_vehicles: 0, total_vehicles: 0, maintenance: 0, delayed_trips: 0, today_trips: 0 })

  useEffect(() => {
    getClients().then(setClients).catch(() => {})
    getAvailableDrivers().then(setAvailableDrivers).catch(() => {})
    getFleet({ limit: 50 }).then(r => setMapVehicles(r.data || [])).catch(() => {})

    // Cargar stats reales para salud del sistema
    Promise.all([
      getTripStats().catch(() => ({})),
      getFleetStats().catch(() => ({})),
      getDriverStats().catch(() => ({})),
    ]).then(([tripStats, fleetStats, driverStats]) => {
      setHealth({
        on_time_rate: tripStats.on_time_rate ?? 0,
        delayed_trips: tripStats.delayed_trips ?? 0,
        today_trips: tripStats.today_trips ?? 0,
        active_vehicles: fleetStats.active ?? 0,
        total_vehicles: fleetStats.total ?? 0,
        maintenance: fleetStats.maintenance ?? 0,
        active_drivers: driverStats.on_duty ?? 0,
        total_drivers: driverStats.total ?? 0,
      })
    })
  }, [])

  const loadTrips = async (p = page) => {
    try {
      const limit = tab === 'history' ? 50 : 4
      const params = { page: p, limit }
      if (tab === 'active') {
        params.status = 'on_time,delayed,pending,in_progress'
      } else {
        params.status = 'completed'
      }
      const res = await getTrips(params)
      setTrips(res.data)
      setPagination(res.pagination)
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTrips() }, [page, tab])

  const handleAssignDriver = async () => {
    if (!assignDriverTrip || !assignDriverId) return
    try {
      await assignDriverToTrip(assignDriverTrip.id, assignDriverId)
      setAssignDriverTrip(null)
      setAssignDriverId('')
      loadTrips(page)
    } catch (e) { console.error(e) }
  }

  const handleCreate = async () => {
    if (!form.route_name) return
    setSaving(true)
    try {
      await createTrip({
        ...form,
        origin_lat: tripOrigin?.lat || null,
        origin_lng: tripOrigin?.lng || null,
        origin_name: tripOrigin?.name || '',
        dest_lat: tripDest?.lat || null,
        dest_lng: tripDest?.lng || null,
        dest_name: tripDest?.name || '',
      })
      setShowModal(false)
      setForm({ route_name: '', route_desc: '', scheduled_time: '', origin: '', destination: '', trip_type: 'one_way', passengers: '1' })
      setTripOrigin(null)
      setTripDest(null)
      loadTrips(1)
    } catch (e) {
      console.error('Error creating trip:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      await updateTrip(id, { status })
      loadTrips(page)
    } catch (e) { console.error(e) }
  }

  const dropdownItems = (trip) => {
    const items = [
      { label: 'Ver Detalles', icon: 'visibility', onClick: () => alert(`Viaje ${trip.trip_id}`) },
    ]
    if (tab === 'active') {
      items.push(
        { label: 'Marcar en Curso', icon: 'play_arrow', onClick: () => handleStatusChange(trip.id, 'in_progress') },
        { label: 'Marcar Completado', icon: 'task_alt', onClick: () => handleStatusChange(trip.id, 'completed') },
        { label: 'Asignar Conductor', icon: 'assignment_ind', onClick: () => { setAssignDriverTrip(trip); setAssignDriverId(String(trip.driver_id || '')) } },
        { label: 'Editar', icon: 'edit', onClick: () => alert(`Editar ${trip.trip_id}`) },
        { divider: true },
        { label: 'Cancelar Viaje', icon: 'cancel', onClick: () => handleStatusChange(trip.id, 'pending'), danger: true },
      )
    }
    return items
  }

  return (
    <>
      <div className="pb-stack-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-stack-lg gap-stack-md">
          <div>
            <h3 className="font-headline-lg text-headline-lg text-primary">Gestión de Viajes</h3>
            <p className="text-on-surface-variant">Supervisión y programación en tiempo real de todos los movimientos de flota.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-stack-sm bg-secondary text-on-secondary px-gutter py-stack-md rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
            <span className="material-symbols-outlined">add</span>
            Nuevo Viaje
          </button>
        </div>

        {/* Tabs: Activos / Histórico */}
        <div className="flex gap-1 mb-stack-md bg-surface-container-low rounded-lg p-1 w-fit">
          <button onClick={() => { setTab('active'); setPage(1); }} className={`flex items-center gap-2 px-5 py-2 rounded-md text-label-md font-bold transition-all ${tab === 'active' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}>
            <span className="material-symbols-outlined text-[16px]">route</span>
            Activos
          </button>
          <button onClick={() => { setTab('history'); setPage(1); }} className={`flex items-center gap-2 px-5 py-2 rounded-md text-label-md font-bold transition-all ${tab === 'history' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}>
            <span className="material-symbols-outlined text-[16px]">history</span>
            Histórico
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-stack-lg">
          {[
            { label: 'Rango de Fechas', icon: 'calendar_today', type: 'date' },
            { label: 'Estado', icon: null, type: 'select', options: ['Todos los Estados', 'A Tiempo', 'Retrasado', 'Completado'] },
            { label: 'Área de Ruta', icon: null, type: 'select', options: ['Todas las Rutas', 'Exprés Norte-Sur', 'Circuito Centro', 'Conexión Aeropuerto'] },
            { label: 'Buscar Conductor', icon: 'person_search', type: 'text', placeholder: 'ID o Nombre' },
          ].map(f => (
            <div key={f.label} className="bg-surface-container-lowest p-stack-md rounded-xl border border-outline-variant flex flex-col gap-unit">
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider">{f.label}</label>
              <div className="flex items-center gap-stack-sm">
                {f.icon && <span className="material-symbols-outlined text-secondary">{f.icon}</span>}
                {f.type === 'date' && <input className="bg-transparent border-none p-0 text-body-md focus:ring-0 w-full" type="date" />}
                {f.type === 'select' && (
                  <select className="bg-transparent border-none p-0 text-body-md focus:ring-0 w-full">
                    {f.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                )}
                {f.type === 'text' && <input className="bg-transparent border-none p-0 text-body-md focus:ring-0 w-full" placeholder={f.placeholder} type="text" />}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="overflow-x-auto hide-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  {['ID Viaje', 'Ruta / Cliente', 'Programado', 'Salida Real', 'Estado', 'Conductor', ''].map(h => (
                    <th key={h} className={`px-gutter py-stack-md text-label-md font-bold text-on-surface-variant uppercase ${h === '' ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-on-surface-variant">Cargando...</td></tr>
                ) : trips.map(t => (
                  <tr key={t.id} className="hover:bg-surface-container transition-colors group">
                    <td className="px-gutter py-stack-md font-bold text-primary">{t.trip_id}</td>
                    <td className="px-gutter py-stack-md">
                      <div className="flex flex-col">
                        <span className="font-bold text-body-md">{t.route_name}</span>
                        <span className="text-label-md text-on-surface-variant">{t.route_desc}</span>
                        {t.client_name && <span className="text-label-md text-secondary mt-0.5">Cliente: {t.client_name}</span>}
                      </div>
                    </td>
                    <td className="px-gutter py-stack-md text-body-md">{t.scheduled_time || '—'}</td>
                    <td className="px-gutter py-stack-md text-body-md">{t.actual_departure || '—'}</td>
                    <td className="px-gutter py-stack-md">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-label-md font-bold border ${t.statusInfo?.class || ''}`}>
                        <span className="material-symbols-outlined text-[16px]">{t.statusInfo?.icon || 'help'}</span>
                        {t.statusInfo?.label || t.status}
                      </span>
                    </td>
                    <td className="px-gutter py-stack-md">
                      <div className="flex items-center gap-stack-sm">
                        <div className="h-6 w-6 rounded-full bg-surface-container-highest flex items-center justify-center text-label-md font-bold text-on-surface-variant">
                          {(t.driver_name || '?')[0]}
                        </div>
                        <span className="text-body-sm font-medium">{t.driver_name || 'Sin asignar'}</span>
                      </div>
                    </td>
                    <td className="px-gutter py-stack-md text-right">
                      <DropdownMenu
                        trigger={<span className="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-colors cursor-pointer">more_vert</span>}
                        items={dropdownItems(t)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-gutter bg-surface-container-low flex items-center justify-between">
            <span className="text-body-sm text-on-surface-variant">Mostrando {trips.length} de {pagination.total} viajes</span>
            <div className="flex gap-unit">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1 px-3 border border-outline-variant rounded bg-surface-container-lowest text-on-surface hover:bg-surface transition-colors font-bold text-body-sm disabled:opacity-50">Anterior</button>
              {Array.from({ length: Math.max(1, pagination.pages) }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)} className={`p-1 px-3 border rounded font-bold text-body-sm ${n === page ? 'border-secondary bg-secondary text-on-secondary' : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface'} transition-colors`}>{n}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(pagination.pages || 1, p + 1))} disabled={page >= (pagination.pages || 1)} className="p-1 px-3 border border-outline-variant rounded bg-surface-container-lowest text-on-surface hover:bg-surface transition-colors font-bold text-body-sm disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        </div>

        {/* Sección inferior */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mt-stack-lg">
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant p-gutter">
            <div className="flex items-center justify-between mb-stack-md">
              <h4 className="font-headline-md text-primary">Densidad de Rutas en Vivo</h4>
              <span className="text-label-md text-on-surface-variant flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-secondary" /> Actualizaciones en Vivo
              </span>
            </div>
            <div className="h-48 w-full rounded-lg overflow-hidden">
              <FleetMap vehicles={mapVehicles} />
            </div>
          </div>
          <div className="bg-primary-container text-on-primary-container rounded-xl p-gutter flex flex-col justify-between shadow-lg">
            <div>
              <h4 className="font-headline-md text-primary-fixed mb-stack-sm">Salud del Sistema</h4>
              <div className="space-y-stack-md">
                <div>
                  <div className="flex justify-between items-center"><span className="text-body-md opacity-80">Rendimiento a Tiempo</span><span className="font-bold text-headline-md">{health.on_time_rate}%</span></div>
                  <div className="w-full bg-on-primary-container/20 h-2 rounded-full overflow-hidden mt-1"><div className="bg-secondary-fixed h-full" style={{ width: `${Math.min(100, health.on_time_rate)}%` }} /></div>
                </div>
                <div>
                  <div className="flex justify-between items-center"><span className="text-body-md opacity-80">Conductores Activos</span><span className="font-bold text-headline-md">{health.active_drivers} / {health.total_drivers}</span></div>
                  <div className="w-full bg-on-primary-container/20 h-2 rounded-full overflow-hidden mt-1"><div className="bg-secondary-fixed h-full" style={{ width: `${health.total_drivers ? (health.active_drivers / health.total_drivers * 100) : 0}%` }} /></div>
                </div>
                <div className="pt-2 border-t border-on-primary-container/20">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-on-primary-container/10">
                      <span className="material-symbols-outlined text-[18px] block mb-0.5">directions_bus</span>
                      <span className="font-bold text-body-md">{health.active_vehicles}</span>
                      <span className="text-label-md block opacity-70">Vehículos</span>
                    </div>
                    <div className="p-2 rounded-lg bg-on-primary-container/10">
                      <span className="material-symbols-outlined text-[18px] block mb-0.5">build</span>
                      <span className="font-bold text-body-md">{health.maintenance}</span>
                      <span className="text-label-md block opacity-70">En Taller</span>
                    </div>
                    <div className="p-2 rounded-lg bg-on-primary-container/10">
                      <span className="material-symbols-outlined text-[18px] block mb-0.5">warning</span>
                      <span className="font-bold text-body-md">{health.delayed_trips}</span>
                      <span className="text-label-md block opacity-70">Demorados</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button className="mt-stack-lg w-full bg-on-primary-container text-primary-container py-stack-md rounded-lg font-bold hover:bg-secondary-fixed transition-colors" onClick={() => setTab('active')}>
              Ver Alertas de Flota
            </button>
          </div>
        </div>
      </div>

      {/* Modal Asignar Conductor */}
      <Modal open={!!assignDriverTrip} onClose={() => setAssignDriverTrip(null)} title={`Asignar Conductor - ${assignDriverTrip?.trip_id || ''}`}>
        <div className="space-y-stack-md">
          <div>
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Seleccionar Conductor</label>
            <select value={assignDriverId} onChange={e => setAssignDriverId(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none">
              <option value="">Sin conductor</option>
              {availableDrivers.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.license})</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-stack-sm pt-stack-md border-t border-outline-variant">
            <button onClick={() => setAssignDriverTrip(null)} className="px-gutter py-stack-sm border border-outline-variant rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors">Cancelar</button>
            <button onClick={handleAssignDriver} className="px-gutter py-stack-sm bg-secondary text-on-secondary rounded-lg font-bold hover:opacity-90 transition-opacity">Asignar Conductor</button>
          </div>
        </div>
      </Modal>

      {/* Modal Nuevo Viaje */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nuevo Viaje" wide>
        <div className="space-y-stack-md">
          <div className="grid grid-cols-2 gap-stack-md">
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Nombre de Ruta *</label>
              <input value={form.route_name} onChange={e => setForm({ ...form, route_name: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="Ej: Exprés Norte-Sur" />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Cliente</label>
              <select value={showNewClient ? '__new__' : form.client_id || ''} onChange={e => { const v = e.target.value; if (v === '__new__') { setShowNewClient(true); setNewClient({ name: '', email: '', phone: '', company: '' }); setForm({ ...form, client_id: '' }); } else { setShowNewClient(false); setForm({ ...form, client_id: v }); } }} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none">
                <option value="">Sin cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="__new__" className="font-bold text-secondary">+ Agregar nuevo cliente</option>
              </select>

              {showNewClient && (
                <div className="mt-2 p-3 bg-secondary/5 border border-secondary/20 rounded-lg space-y-2">
                  <p className="text-label-md font-bold text-secondary">Nuevo Cliente</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-1.5 text-body-sm focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="Nombre *" />
                    <input value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-1.5 text-body-sm focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="Email" />
                    <input value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-1.5 text-body-sm focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="Teléfono" />
                    <input value={newClient.company} onChange={e => setNewClient({ ...newClient, company: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-1.5 text-body-sm focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="Empresa" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowNewClient(false)} className="px-3 py-1 text-body-sm border border-outline-variant rounded text-on-surface-variant hover:bg-surface-container-low">Cancelar</button>
                    <button onClick={async () => {
                      if (!newClient.name) return
                      try {
                        const res = await createClient(newClient)
                        const updated = await getClients()
                        setClients(updated)
                        setForm({ ...form, client_id: String(res.id) })
                        setShowNewClient(false)
                      } catch (e) { alert('Error al crear cliente') }
                    }} className="px-3 py-1 text-body-sm bg-secondary text-on-secondary rounded font-bold hover:opacity-90">Guardar Cliente</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tipo de Viaje */}
          <div>
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-2">Tipo de Viaje</label>
            <div className="flex gap-2">
              {tripTypeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setForm({ ...form, trip_type: opt.value })}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 font-bold text-body-md transition-all ${
                    form.trip_type === opt.value
                      ? 'border-secondary bg-secondary/10 text-secondary'
                      : 'border-outline-variant text-on-surface-variant hover:border-secondary/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pasajeros */}
          <div className="grid grid-cols-2 gap-stack-md">
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Cant. Pasajeros</label>
              <input type="number" min="1" value={form.passengers} onChange={e => setForm({ ...form, passengers: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="1" />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Hora Programada</label>
              <input value={form.scheduled_time} onChange={e => setForm({ ...form, scheduled_time: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" type="time" />
            </div>
          </div>

          {/* Mapa */}
          <div>
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-2">Seleccioná puntos en el mapa</label>
            <TripMapPicker origin={tripOrigin} setOrigin={setTripOrigin} destination={tripDest} setDestination={setTripDest} />
            <div className="mt-2 flex gap-2 text-body-sm">
              <div className="flex-1 p-2 rounded bg-surface-container-low border border-outline-variant">
                <span className="font-bold text-secondary">Origen</span>
                {tripOrigin ? (
                  <>
                    <p className="text-body-xs text-on-surface-variant mt-0.5">{tripOrigin.lat}, {tripOrigin.lng}</p>
                    <input value={tripOrigin.name || ''} onChange={e => setTripOrigin({ ...tripOrigin, name: e.target.value })} className="w-full bg-transparent border-b border-outline-variant mt-1 py-0.5 text-body-xs outline-none" placeholder="Nombre del punto de origen" />
                  </>
                ) : <p className="text-body-xs text-on-surface-variant">Hacé click en el mapa</p>}
              </div>
              <div className="flex-1 p-2 rounded bg-surface-container-low border border-outline-variant">
                <span className="font-bold text-secondary">Destino</span>
                {tripDest ? (
                  <>
                    <p className="text-body-xs text-on-surface-variant mt-0.5">{tripDest.lat}, {tripDest.lng}</p>
                    <input value={tripDest.name || ''} onChange={e => setTripDest({ ...tripDest, name: e.target.value })} className="w-full bg-transparent border-b border-outline-variant mt-1 py-0.5 text-body-xs outline-none" placeholder="Nombre del punto de destino" />
                  </>
                ) : <p className="text-body-xs text-on-surface-variant">Hacé click en el mapa</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-stack-sm pt-stack-md border-t border-outline-variant">
            <button onClick={() => { setShowModal(false); setTripOrigin(null); setTripDest(null) }} className="px-gutter py-stack-sm border border-outline-variant rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors">Cancelar</button>
            <button onClick={handleCreate} disabled={saving} className="px-gutter py-stack-sm bg-secondary text-on-secondary rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Creando...' : 'Crear Viaje'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
