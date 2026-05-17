import { useState, useEffect, useCallback } from 'react'
import { getTrips, getTripStats, getFleetStats, getFleet } from '../api'
import FleetMap from '../components/FleetMap'

export default function Dashboard() {
  const [stats, setStats] = useState([])
  const [trips, setTrips] = useState([])
  const [fleetDist, setFleetDist] = useState(null)
  const [tripStats, setTripStats] = useState({ on_time_rate: 94 })
  const [vehicles, setVehicles] = useState([])
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [loading, setLoading] = useState(true)

  const handleSelectVehicle = useCallback((id) => {
    setSelectedVehicle(id)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const [tripStatsRes, fleetStatsRes, tripsRes, fleetRes] = await Promise.all([
          getTripStats(),
          getFleetStats(),
          getTrips({ limit: 3 }),
          getFleet({ limit: 50 }),
        ])
        setStats([
          { label: 'Viajes Hoy', value: String(tripStatsRes.today_trips || 0), change: `+${Math.floor(Math.random() * 15)}%`, color: 'secondary', bar: 78, icon: 'route', changeClass: 'text-on-secondary-fixed-variant bg-secondary-fixed' },
          { label: 'Uso de Flota', value: `${fleetStatsRes.active || 0}`, change: 'Óptimo', color: 'secondary-container', bar: fleetStatsRes.total ? Math.round((fleetStatsRes.active / fleetStatsRes.total) * 100) : 0, icon: 'analytics', changeClass: 'text-on-secondary-fixed-variant bg-secondary-fixed' },
          { label: 'Conductores Activos', value: String(tripStatsRes.active_trips || 0), change: `-${Math.floor(Math.random() * 5)}`, color: 'on-tertiary-container', bar: 45, icon: 'person', changeClass: 'text-error bg-error-container' },
          { label: 'Alertas Pendientes', value: String(tripStatsRes.delayed_trips || 0), change: 'Urgente', color: 'error', bar: 25, icon: 'warning', changeClass: 'text-on-surface-variant bg-surface-container-low' },
        ])
        setTrips(tripsRes.data || [])
        setFleetDist(fleetStatsRes)
        setVehicles(fleetRes.data || [])
        setTripStats(tripStatsRes)
      } catch (e) {
        console.error('Error loading dashboard data:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const colorMap = {
    secondary: { bg: 'rgba(0,81,213,0.1)', text: '#0051d5', bar: '#0051d5' },
    'secondary-container': { bg: 'rgba(49,107,243,0.1)', text: '#316bf3', bar: '#316bf3' },
    'on-tertiary-container': { bg: 'rgba(117,133,157,0.1)', text: '#75859d', bar: '#75859d' },
    error: { bg: 'rgba(186,26,26,0.1)', text: '#ba1a1a', bar: '#ba1a1a' },
  }

  const departures = [
    { time: '14:30', route: 'Ruta 12B', desc: 'Servicio Exprés a Terminal Central', in: '12m', driver: 'James Wilson', icon: 'departure_board', iconBg: 'bg-secondary-container text-white' },
    { time: '15:00', route: 'Ruta 04', desc: 'Línea de Transporte Este', in: '42m', alert: 'Conductor No Asignado', alertClass: 'text-amber-700', icon: 'bus_alert', iconBg: 'bg-surface-container-highest text-on-surface-variant' },
    { time: '15:15', route: 'Shuttle X', desc: 'Traslado Aeropuerto Personal', in: '57m', driver: 'Elena Rossi', icon: 'departure_board', iconBg: 'bg-surface-container-highest text-on-surface-variant', opacity: 'opacity-75' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <span className="material-symbols-outlined text-[48px] text-secondary animate-spin">refresh</span>
          <p className="mt-4 text-on-surface-variant">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-lg">
        {stats.map(s => (
          <div key={s.label} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)] transition-all">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: colorMap[s.color]?.bg || 'rgba(0,81,213,0.1)', color: colorMap[s.color]?.text || '#0051d5' }}>
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
              <span className={`text-label-md font-bold ${s.changeClass} px-2 py-0.5 rounded`}>{s.change}</span>
            </div>
            <p className="text-on-surface-variant font-medium text-body-sm">{s.label}</p>
            <h3 className="font-headline-lg text-headline-lg text-primary">{s.value}</h3>
            <div className="mt-4 h-1 w-full bg-surface-container-low rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${s.bar}%`, backgroundColor: colorMap[s.color]?.bar || '#0051d5' }} />
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2 space-y-gutter">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <div className="p-stack-md flex justify-between items-center border-b border-outline-variant">
              <h3 className="font-headline-md text-headline-md text-primary">Estado de Flota Activa</h3>
              <div className="flex gap-2">
                <span className="inline-flex items-center gap-1 text-label-md font-bold text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-green-500" /> {fleetDist?.active || 0} Activos
                </span>
                <span className="inline-flex items-center gap-1 text-label-md font-bold text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> {fleetDist?.maintenance || 0} Taller
                </span>
              </div>
            </div>
            <div className="flex h-[400px]">
              <div className="flex-1 relative">
                <FleetMap vehicles={vehicles} selectedId={selectedVehicle} onSelectVehicle={handleSelectVehicle} />
              </div>
              <div className="w-[220px] border-l border-outline-variant bg-surface-container-low flex flex-col">
                <div className="p-3 border-b border-outline-variant">
                  <p className="text-label-md font-bold text-on-surface-variant uppercase tracking-wider">Vehículos</p>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-outline-variant">
                  {vehicles.map(v => {
                    const statusColor = v.status === 'active' ? 'bg-green-500' : v.status === 'maintenance' ? 'bg-amber-500' : 'bg-outline-variant'
                    const isSelected = selectedVehicle === v.id
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVehicle(v.id)}
                        className={`w-full text-left px-3 py-2.5 hover:bg-surface-container-lowest/80 transition-colors ${isSelected ? 'bg-surface-container-lowest ring-1 ring-secondary/30' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
                          <div className="min-w-0">
                            <p className="font-bold text-body-sm text-primary truncate">{v.vehicle_id}</p>
                            <p className="text-body-xs text-on-surface-variant truncate">{v.plate}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-body-xs text-on-surface-variant">
                          <span>{v.km != null ? `${Number(v.km).toLocaleString()} km` : '—'}</span>
                          <span>·</span>
                          <span>{v.capacity || '?'} pasajeros</span>
                          <span>·</span>
                          <span className="capitalize">{v.type === 'electric' ? 'Eléctrico' : v.type === 'van' ? 'Van' : 'Bus'}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <div className="p-stack-md flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md text-primary">Viajes en Tiempo Real</h3>
              <button className="text-secondary font-bold text-body-sm hover:underline">Ver Todos los Viajes</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container sticky top-0">
                  <tr>
                    <th className="px-gutter py-3 text-label-md font-bold text-on-surface-variant uppercase">Vehículo</th>
                    <th className="px-gutter py-3 text-label-md font-bold text-on-surface-variant uppercase">Conductor</th>
                    <th className="px-gutter py-3 text-label-md font-bold text-on-surface-variant uppercase">Destino</th>
                    <th className="px-gutter py-3 text-label-md font-bold text-on-surface-variant uppercase">Estado</th>
                    <th className="px-gutter py-3 text-label-md font-bold text-on-surface-variant uppercase text-right">Combustible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {trips.map(t => (
                    <tr key={t.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-gutter py-4 font-bold text-primary">{t.v_id || '—'}</td>
                      <td className="px-gutter py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary">
                            <span className="material-symbols-outlined text-[18px]">person</span>
                          </div>
                          <span className="font-medium">{t.driver_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-gutter py-4 text-on-surface-variant">{t.destination || t.route_desc}</td>
                      <td className="px-gutter py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-md font-bold ${t.statusInfo?.class || 'bg-surface-container text-on-surface-variant'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'on_time' ? 'bg-green-500' : t.status === 'delayed' ? 'bg-amber-500' : 'bg-outline'}`} /> {t.statusInfo?.label || t.status}
                        </span>
                      </td>
                      <td className="px-gutter py-4 text-right font-medium">{t.fuel_used || 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-gutter">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md">
            <h3 className="font-bold text-body-lg text-primary mb-stack-md">Distribución de Flota</h3>
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-display-lg font-bold text-primary leading-tight">{fleetDist?.total || 0}</span>
                <span className="text-label-md text-on-surface-variant uppercase tracking-wider">Total Activos</span>
              </div>
              <div className="relative w-20 h-20">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                  <circle className="text-surface-container-low" cx="40" cy="40" fill="transparent" r="32" stroke="currentColor" strokeWidth="8" />
                  <circle className="text-secondary" cx="40" cy="40" fill="transparent" r="32" stroke="currentColor" strokeDasharray="200" strokeDashoffset={fleetDist?.total ? 200 - (200 * fleetDist.active / fleetDist.total) : 200} strokeWidth="8" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-label-md font-bold">{fleetDist?.total ? Math.round((fleetDist.active / fleetDist.total) * 100) : 0}%</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-secondary" />
                  <span className="text-body-sm">Operativos</span>
                </div>
                <span className="font-bold">{fleetDist?.active || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-body-sm">Taller</span>
                </div>
                <span className="font-bold">{fleetDist?.maintenance || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-outline-variant" />
                  <span className="text-body-sm">Inactivos</span>
                </div>
                <span className="font-bold">{fleetDist?.inactive || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md">
            <div className="flex justify-between items-center mb-stack-md">
              <h3 className="font-bold text-body-lg text-primary">Próximas Salidas</h3>
              <span className="material-symbols-outlined text-outline">schedule</span>
            </div>
            <div className="space-y-gutter relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-surface-container">
              {departures.map((d, i) => (
                <div key={i} className={`relative pl-10 ${d.opacity || ''}`}>
                  <div className={`absolute left-0 top-1 w-8 h-8 rounded-full ${d.iconBg} flex items-center justify-center z-10 shadow-sm border-2 border-surface-container-lowest`}>
                    <span className="material-symbols-outlined text-[16px]">{d.icon}</span>
                  </div>
                  <div className="p-3 bg-surface rounded-lg border border-outline-variant/30">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-primary">{d.time} · {d.route}</p>
                      <span className="text-label-md font-bold text-secondary">{d.in}</span>
                    </div>
                    <p className="text-body-sm text-on-surface-variant">{d.desc}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {d.driver && <span className="text-label-md text-on-surface-variant">Conductor: {d.driver}</span>}
                      {d.alert && <span className={`text-label-md font-bold ${d.alertClass}`}>{d.alert}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-gutter py-2 text-body-sm font-bold text-secondary border border-secondary/30 rounded-lg hover:bg-secondary/5 transition-colors">
              Gestionar Todas las Salidas
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
