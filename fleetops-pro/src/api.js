const API_BASE = '/api';

async function fetchJSON(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

// ── Trips ──────────────────────────────────────────
export function getTrips(params = {}) {
  const q = new URLSearchParams(params).toString();
  return fetchJSON(`/trips${q ? `?${q}` : ''}`);
}

export function getTripStats() {
  return fetchJSON('/trips/stats');
}

export function createTrip(data) {
  return fetchJSON('/trips', { method: 'POST', body: JSON.stringify(data) });
}

export function updateTrip(id, data) {
  return fetchJSON(`/trips/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// ── Fleet ──────────────────────────────────────────
export function getFleet(params = {}) {
  const q = new URLSearchParams(params).toString();
  return fetchJSON(`/fleet${q ? `?${q}` : ''}`);
}

export function getVehicle(id) {
  return fetchJSON(`/fleet/${id}`);
}

export function getFleetStats() {
  return fetchJSON('/fleet/stats');
}

export function getMaintenance() {
  return fetchJSON('/fleet/maintenance');
}

export function createVehicle(data) {
  return fetchJSON('/fleet', { method: 'POST', body: JSON.stringify(data) });
}

export function sendToTaller(id, checklist, reason = '', explanation = '', type = 'mantenimiento', km = null) {
  return fetchJSON(`/fleet/${id}/send-to-taller`, { method: 'POST', body: JSON.stringify({ checklist, reason, explanation, type, km }) });
}

export function toggleChecklistItem(maintId, itemId, checked) {
  return fetchJSON(`/fleet/maintenance/${maintId}/checklist/${itemId}`, { method: 'PATCH', body: JSON.stringify({ checked }) });
}

export function updateVehicle(id, data) {
  return fetchJSON(`/fleet/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteVehicle(id) {
  return fetchJSON(`/fleet/${id}`, { method: 'DELETE' });
}

// ── Drivers ────────────────────────────────────────
export function getDrivers(params = {}) {
  const q = new URLSearchParams(params).toString();
  return fetchJSON(`/drivers${q ? `?${q}` : ''}`);
}

export function getDriverStats() {
  return fetchJSON('/drivers/stats');
}

export function getLiveDrivers() {
  return fetchJSON('/drivers/live');
}

export function getAvailableDrivers() {
  return fetchJSON('/drivers/available');
}

export function createDriver(data) {
  return fetchJSON('/drivers', { method: 'POST', body: JSON.stringify(data) });
}

export function updateDriver(id, data) {
  return fetchJSON(`/drivers/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteDriver(id) {
  return fetchJSON(`/drivers/${id}`, { method: 'DELETE' });
}

// ── Trips (unassigned) ────────────────────────────
export function getUnassignedTrips() {
  return fetchJSON('/trips/unassigned');
}

export function assignDriverToTrip(tripId, driverId) {
  return fetchJSON(`/trips/${tripId}/assign-driver`, { method: 'PATCH', body: JSON.stringify({ driver_id: driverId }) });
}

// ── Clients ────────────────────────────────────────
export function getClients() {
  return fetchJSON('/clients');
}

export function getClient(id) {
  return fetchJSON(`/clients/${id}`);
}

export function createClient(data) {
  return fetchJSON('/clients', { method: 'POST', body: JSON.stringify(data) });
}

export function updateClient(id, data) {
  return fetchJSON(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteClient(id) {
  return fetchJSON(`/clients/${id}`, { method: 'DELETE' });
}

// ── Settings ───────────────────────────────────────
export function getSettings() {
  return fetchJSON('/settings');
}

export function updateSettings(data) {
  return fetchJSON('/settings', { method: 'PUT', body: JSON.stringify(data) });
}

export function uploadLogo(data) {
  return fetchJSON('/settings/logo', { method: 'POST', body: JSON.stringify({ data }) });
}

export function exportData() {
  return fetchJSON('/settings/export');
}

export function resetData() {
  return fetchJSON('/settings/reset', { method: 'POST' });
}

// ── Auth ───────────────────────────────────────────
export function login(email, password) {
  return fetchJSON('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function getMe() {
  const token = localStorage.getItem('fleetops_token');
  return fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => {
    if (!r.ok) throw new Error('No autorizado');
    return r.json();
  });
}

// ── Notifications ──────────────────────────────────
export function getNotifications() {
  return fetchJSON('/notifications');
}

export function getUnreadCount() {
  return fetchJSON('/notifications/unread-count');
}

export function markAsRead(id) {
  return fetchJSON(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllAsRead() {
  return fetchJSON('/notifications/read-all', { method: 'PATCH' });
}

// ── Activity ────────────────────────────────────────
export function getActivity() {
  return fetchJSON('/activity');
}

// ── Users ──────────────────────────────────────────
export function getUsers() {
  return fetchJSON('/users');
}

export function createUser(data) {
  return fetchJSON('/users', { method: 'POST', body: JSON.stringify(data) });
}

export function updateUser(id, data) {
  return fetchJSON(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteUser(id) {
  return fetchJSON(`/users/${id}`, { method: 'DELETE' });
}
