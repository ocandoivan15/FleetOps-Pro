import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyTrips } from '../api'

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  delayed: 'bg-red-100 text-red-800',
  on_time: 'bg-green-100 text-green-800',
}

const STATUS_LABELS = {
  pending: 'Pendiente',
  in_progress: 'En Curso',
  completed: 'Completado',
  delayed: 'Retrasado',
  on_time: 'A Tiempo',
}

export default function Dashboard({ driver }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getMyTrips()
      .then(setTrips)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const inProgress = trips.filter(t => t.status === 'in_progress')
  const pending = trips.filter(t => t.status === 'pending')
  const completed = trips.filter(t => t.completed)

  return (
    <div className="p-4 space-y-4 pb-safe">
      {/* Driver card */}
      <div className="bg-primary-container/30 rounded-2xl p-4 border border-primary-container/50">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold">
            {driver.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg text-on-surface">{driver.name}</h2>
            <p className="text-sm text-on-surface-variant">C.I. {driver.cedula}</p>
            <p className="text-sm text-on-surface-variant">{driver.license}</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
            driver.status === 'on_duty' ? 'bg-green-100 text-green-800' : 
            driver.status === 'rest' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
          }`}>
            {driver.status === 'on_duty' ? 'Activo' : driver.status === 'rest' ? 'Descanso' : 'Crítico'}
          </div>
        </div>
      </div>

      {/* Active trip banner */}
      {inProgress.length > 0 && (
        <button
          onClick={() => navigate(`/trips/${inProgress[0].id}`)}
          className="w-full bg-primary text-on-primary rounded-2xl p-4 text-left shadow-md active:scale-[0.98] transition-transform"
        >
          <p className="text-xs opacity-80 mb-1">VIAJE EN CURSO</p>
          <p className="font-bold text-lg">{inProgress[0].route_name}</p>
          <p className="text-sm opacity-90 mt-1">{inProgress[0].origin} → {inProgress[0].destination}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="animate-pulse w-3 h-3 bg-white rounded-full" />
            <span className="text-sm">Tocar para ver detalle</span>
          </div>
        </button>
      )}

      {/* Trips list */}
      <div>
        <h3 className="font-bold text-base text-on-surface mb-3">Mis Viajes</h3>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px]">route</span>
            <p className="mt-2">No tienes viajes asignados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map(trip => (
              <button
                key={trip.id}
                onClick={() => navigate(`/trips/${trip.id}`)}
                className="w-full bg-surface-container-lowest rounded-2xl p-4 text-left border border-outline-variant active:scale-[0.98] transition-transform shadow-sm"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-bold text-on-surface">{trip.route_name}</p>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[trip.status] || 'bg-surface-container text-on-surface-variant'}`}>
                    {STATUS_LABELS[trip.status] || trip.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-2">
                  <span className="material-symbols-outlined text-[16px]">trip_origin</span>
                  <span>{trip.origin || '—'}</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  <span className="material-symbols-outlined text-[16px]">location_on</span>
                  <span>{trip.destination || '—'}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                  {trip.plate && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">directions_bus</span>
                      {trip.plate}
                    </span>
                  )}
                  {trip.scheduled_time && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {trip.scheduled_time}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
