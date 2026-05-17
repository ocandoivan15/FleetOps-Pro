import { useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CENTER = [10.6544, -71.6525]

function vehicleIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;
      background:${color};
      border:3px solid white;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      font-size:16px;color:white;
    "><span style="font-family:'Material Symbols Outlined';font-size:16px;">directions_bus</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function popupContent(v) {
  const sc = { active: '#16a34a', maintenance: '#d97706', inactive: '#6b7280', out_of_service: '#6b7280' }[v.status] || '#6b7280'
  const sl = { active: 'Activo', maintenance: 'En Taller', inactive: 'Inactivo', out_of_service: 'Fuera de Servicio' }[v.status] || v.status
  const typeLabel = v.type === 'electric' ? 'Eléctrico' : v.type === 'van' ? 'Van' : 'Autobús'
  return `
    <div style="font-family:Inter,system-ui,sans-serif;min-width:220px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="width:40px;height:40px;border-radius:10px;background:${sc}15;display:flex;align-items:center;justify-content:center;color:${sc};font-size:22px;">
          <span style="font-family:'Material Symbols Outlined'">directions_bus</span>
        </div>
        <div>
          <p style="font-weight:700;font-size:15px;margin:0;color:#1a1a2e;">${v.vehicle_id}</p>
          <p style="font-size:12px;color:#666;margin:2px 0 0;">${v.plate || ''}</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:12px;">
        <p style="margin:0;color:#888;">Modelo</p>
        <p style="margin:0;font-weight:600;color:#1a1a2e;text-align:right;">${v.model || '—'}</p>
        <p style="margin:0;color:#888;">Año</p>
        <p style="margin:0;font-weight:600;color:#1a1a2e;text-align:right;">${v.year || '—'}</p>
        <p style="margin:0;color:#888;">Kilometraje</p>
        <p style="margin:0;font-weight:600;color:#1a1a2e;text-align:right;">${v.km != null ? Number(v.km).toLocaleString() + ' km' : '—'}</p>
      </div>
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid #eee;">
        <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;background:${sc}15;color:${sc}">
          <span style="width:6px;height:6px;border-radius:50%;background:${sc};display:inline-block;"></span>
          ${sl}
        </span>
        <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;background:#f0f2f5;color:#666;margin-left:4px;">
          ${typeLabel}
        </span>
      </div>
    </div>
  `
}

function generatePos(index, total) {
  const angle = (index / total) * Math.PI * 2
  const radius = 0.015 + Math.random() * 0.025
  return [CENTER[0] + Math.cos(angle) * radius, CENTER[1] + Math.sin(angle) * radius]
}

export default function FleetMap({ vehicles = [], selectedId, onSelectVehicle }) {
  const mapRef = useRef(null)
  const initialized = useRef(false)
  const markersRef = useRef({})
  const clusterRef = useRef(null)

  // Init map once
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const map = L.map(mapRef.current, {
      center: CENTER,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    })

    // Layers
    const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 })
    const street = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 })
    sat.addTo(map)

    L.control.layers({ Satelital: sat, Callejero: street }, {}, { position: 'topright' }).addTo(map)
    L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Fullscreen
    const fsBtn = L.control({ position: 'topright' })
    fsBtn.onAdd = () => {
      const el = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
      el.innerHTML = '<a href="#" role="button" title="Pantalla Completa" style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;font-size:18px;line-height:30px;cursor:pointer;">⛶</a>'
      el.onclick = () => {
        const c = mapRef.current
        if (!document.fullscreenElement) c.requestFullscreen?.()
        else document.exitFullscreen?.()
      }
      return el
    }
    fsBtn.addTo(map)

    // Cluster group with Leaflet 1.x compatible API
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cl) => {
        const count = cl.getChildCount()
        const color = count > 10 ? '#dc2626' : count > 5 ? '#d97706' : '#0051d5'
        return L.divIcon({
          html: `<div style="width:40px;height:40px;border-radius:50%;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;font-family:Inter,sans-serif;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${count}</div>`,
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        })
      },
    })
    map.addLayer(cluster)
    clusterRef.current = cluster

    // Store map
    mapRef.current.__map = map
  }, [])

  // Update markers
  useEffect(() => {
    const map = mapRef.current?.__map
    if (!map || !clusterRef.current) return

    clusterRef.current.clearLayers()
    markersRef.current = {}

    if (vehicles.length === 0) return

    const active = vehicles.filter(v => v.status === 'active')
    const maint = vehicles.filter(v => v.status === 'maintenance')
    const rest = vehicles.filter(v => v.status !== 'active' && v.status !== 'maintenance')

    const markers = [
      ...active.map((v, i) => ({ v, pos: generatePos(i, active.length || 1), color: '#0051d5' })),
      ...maint.map((v, i) => ({ v, pos: generatePos(i + active.length, vehicles.length), color: '#d97706' })),
      ...rest.map((v, i) => ({ v, pos: generatePos(i + active.length + maint.length, vehicles.length), color: '#6b7280' })),
    ]

    markers.forEach(({ v, pos, color }) => {
      const marker = L.marker(pos, { icon: vehicleIcon(color) })
        .bindPopup(popupContent(v), { closeButton: false, maxWidth: 280 })
        .on('click', () => onSelectVehicle?.(v.id))

      markersRef.current[v.id] = marker
      clusterRef.current.addLayer(marker)
    })
  }, [vehicles, onSelectVehicle])

  // Zoom to selected
  useEffect(() => {
    if (!selectedId) return
    const map = mapRef.current?.__map
    const marker = markersRef.current[selectedId]
    if (map && marker) {
      map.setView(marker.getLatLng(), 15, { animate: true })
      marker.openPopup()
    }
  }, [selectedId])

  return <div ref={mapRef} className="w-full h-full" style={{ background: '#e8eaed' }} />
}
