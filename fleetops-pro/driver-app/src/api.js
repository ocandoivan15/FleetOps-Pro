const API_BASE = '/api'

function getToken() {
  return localStorage.getItem('fleetops_driver_token')
}

async function fetchJSON(url, options = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${url}`, { headers, ...options })
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('fleetops_driver_token')
      localStorage.removeItem('fleetops_driver')
      window.location.href = '/'
    }
    throw new Error(`API error: ${res.status}`)
  }
  return res.json()
}

export function driverLogin(cedula, password) {
  return fetchJSON('/drivers/login', { method: 'POST', body: JSON.stringify({ cedula, password }) })
}

export function getDriverMe() {
  return fetchJSON('/drivers/me')
}

export function getMyTrips() {
  return fetchJSON('/driver/trips')
}

export function startTrip(id) {
  return fetchJSON(`/driver/trips/${id}/start`, { method: 'PATCH' })
}

export function completeTrip(id, km) {
  return fetchJSON(`/driver/trips/${id}/complete`, { method: 'PATCH', body: JSON.stringify({ km }) })
}

export function reportLocation(lat, lng, tripId) {
  return fetchJSON('/driver/location', { method: 'POST', body: JSON.stringify({ lat, lng, trip_id: tripId }) })
}
