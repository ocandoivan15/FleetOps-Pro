import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMyTrips, startTrip, completeTrip, reportLocation } from '../api'

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [km, setKm] = useState('')
  const [showComplete, setShowComplete] = useState(false)
  const [gpsActive, setGpsActive] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [lastReport, setLastReport] = useState(null)
  const watchId = useRef(null)
  const lastReportTime = useRef(0)

  // Fetch trip data
  useEffect(() => {
    getMyTrips()
      .then(trips => {
        const found = trips.find(t => t.id == id)
        setTrip(found || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  // GPS tracking — starts when trip is in_progress, stops on complete/unmount
  useEffect(() => {
    if (!trip || trip.status !== 'in_progress') {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
        setGpsActive(false)
      }
      return
    }

    // Check geolocation support
    if (!navigator.geolocation) {
      setGpsError('GPS no disponible en este dispositivo')
      return
    }

    const onPosition = (pos) => {
      setGpsActive(true)
      setGpsError('')
      const now = Date.now()
      // Throttle to one report every 30s
      if (now - lastReportTime.current >= 30000) {
        lastReportTime.current = now
        setLastReport(new Date().toLocaleTimeString())
        reportLocation(pos.coords.latitude, pos.coords.longitude, trip.id)
          .catch(() => {}) // Silent fail
      }
    }

    const onError = (err) => {
      const messages = {
        1: 'Permiso de GPS denegado',
        2: 'Señal GPS no disponible',
        3: 'Búsqueda de GPS agotada',
      }
      setGpsError(messages[err.code] || 'Error de GPS')
      setGpsActive(false)
    }

    watchId.current = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    })

    // Cleanup watcher on unmount or status change
    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
        setGpsActive(false)
      }
    }
  }, [trip?.id, trip?.status])

  const handleStart = async () => {
    setActionLoading(true)
    try {
      await startTrip(id)
      const trips = await getMyTrips()
      setTrip(trips.find(t => t.id == id))
    } catch {}
    setActionLoading(false)
  }

  const handleComplete = async () => {
    setActionLoading(true)
    try {
      await completeTrip(id, parseInt(km) || 0)
      navigate('/')
    } catch {}
    setActionLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="p-4 text-center py-12 text-on-surface-variant">
        <span className="material-symbols-outlined text-[48px]">search_off</span>
        <p className="mt-2">Viaje no encontrado</p>
        <button onClick={() => navigate('/')} className="mt-4 text-primary font-bold">Volver</button>
      </div>
    )
  }

  const canStart = trip.status === 'pending'
  const canComplete = trip.status === 'in_progress'

  return (
    <div className="p-4 space-y-4 pb-safe">
      {/* Back */}
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-on-surface-variant">
        <span className="material-symbols-outlined">arrow_back</span>
        <span className="text-sm font-medium">Volver</span>
      </button>

      {/* Status card */}
      <div className={`rounded-2xl p-5 ${
        trip.status === 'in_progress' ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest border border-outline-variant'
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className={trip.status === 'in_progress' ? 'text-xs opacity-80' : 'text-xs text-on-surface-variant'}>RUTA</p>
            <h2 className="font-bold text-xl mt-0.5">{trip.route_name}</h2>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
            trip.status === 'in_progress' ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'
          }`}>
            {trip.status === 'in_progress' ? 'En Curso' : trip.status}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">trip_origin</span>
            <span>{trip.origin || 'No especificado'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">location_on</span>
            <span>{trip.destination || 'No especificado'}</span>
          </div>
          {trip.scheduled_time && (
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
              <span>{trip.scheduled_time}</span>
            </div>
          )}
        </div>
      </div>

      {/* GPS indicator */}
      {trip.status === 'in_progress' && (
        <div className={`rounded-2xl p-4 border ${gpsActive ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-3">
            {gpsActive ? (
              <>
                <span className="relative flex w-4 h-4">
                  <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex w-4 h-4 rounded-full bg-green-500" />
                </span>
                <div className="flex-1">
                  <p className="font-bold text-sm text-green-800">GPS Activo</p>
                  <p className="text-xs text-green-600">
                    {lastReport ? `Último reporte: ${lastReport}` : 'Iniciando GPS...'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <span className="w-4 h-4 rounded-full bg-amber-400" />
                <div className="flex-1">
                  <p className="font-bold text-sm text-amber-800">GPS: {gpsError || 'Esperando señal...'}</p>
                </div>
              </>
            )}
            <span className="material-symbols-outlined text-green-600">my_location</span>
          </div>
        </div>
      )}

      {/* Vehicle info */}
      {trip.vehicle_id && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4">
          <p className="text-xs text-on-surface-variant mb-2">VEHÍCULO ASIGNADO</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary-container/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary">directions_bus</span>
            </div>
            <div>
              <p className="font-bold">{trip.vehicle_id || '—'}</p>
              <p className="text-sm text-on-surface-variant">{trip.plate} · {trip.model}</p>
            </div>
          </div>
        </div>
      )}

      {/* Client info */}
      {trip.client_name && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4">
          <p className="text-xs text-on-surface-variant mb-2">CLIENTE</p>
          <p className="font-bold">{trip.client_name}</p>
          {trip.client_company && <p className="text-sm text-on-surface-variant">{trip.client_company}</p>}
        </div>
      )}

      {/* Actions */}
      {canStart && (
        <button
          onClick={handleStart}
          disabled={actionLoading}
          className="w-full py-4 bg-primary text-on-primary rounded-2xl font-bold text-base disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md"
        >
          {actionLoading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined">play_arrow</span>
          )}
          {actionLoading ? 'Iniciando...' : 'Iniciar Viaje'}
        </button>
      )}

      {canComplete && !showComplete && (
        <button
          onClick={() => setShowComplete(true)}
          className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md"
        >
          <span className="material-symbols-outlined">check_circle</span>
          Completar Viaje
        </button>
      )}

      {showComplete && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 space-y-3">
          <p className="font-bold text-on-surface">Finalizar Viaje</p>
          <div>
            <label className="block text-sm text-on-surface-variant mb-1">Kilómetros recorridos</label>
            <input
              type="number"
              inputMode="numeric"
              value={km}
              onChange={e => setKm(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowComplete(false)} className="flex-1 py-3 rounded-xl border border-outline-variant font-bold text-on-surface">
              Cancelar
            </button>
            <button onClick={handleComplete} disabled={actionLoading} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {actionLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              Finalizar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
