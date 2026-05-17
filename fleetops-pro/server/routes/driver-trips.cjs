const express = require('express');
const router = express.Router();
const db = require('../database.cjs');

// Helper: extract driver ID from token
function getDriverId(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const decoded = Buffer.from(auth.slice(7), 'base64').toString();
    const [id] = decoded.split(':');
    return parseInt(id);
  } catch { return null; }
}

function requireDriver(req, res, next) {
  const driverId = getDriverId(req);
  if (!driverId) return res.status(401).json({ error: 'No autorizado' });
  req.driverId = driverId;
  next();
}

// GET /api/driver/trips — my assigned trips
router.get('/trips', requireDriver, (req, res) => {
  const trips = db.prepare(`
    SELECT t.*, v.vehicle_id, v.plate, v.model,
           c.name as client_name, c.company as client_company
    FROM trips t
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN clients c ON t.client_id = c.id
    WHERE t.driver_id = ?
    ORDER BY t.created_at DESC
    LIMIT 50
  `).all(req.driverId);
  res.json(trips);
});

// PATCH /api/driver/trips/:id/start — mark trip as in_progress
router.patch('/trips/:id/start', requireDriver, (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND driver_id = ?').get(req.params.id, req.driverId);
  if (!trip) return res.status(404).json({ error: 'Viaje no encontrado' });
  db.prepare("UPDATE trips SET status = 'in_progress', actual_departure = datetime('now') WHERE id = ?").run(req.params.id);
  // Notification + activity log + socket
  db.prepare(`INSERT INTO notifications (type, title, message, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`)
    .run('trip_created', 'Viaje iniciado', `Viaje ${trip.trip_id} iniciado por conductor`, 'trip', trip.id);
  db.prepare(`INSERT INTO activity_log (action, description, entity_type, entity_id) VALUES (?, ?, ?, ?)`)
    .run('trip.started', `Viaje ${trip.trip_id} iniciado por conductor`, 'trip', trip.id);
  try { req.app.get('io').emit('notification'); } catch(e) {}
  try { req.app.get('io').emit('trip:update'); } catch(e) {}
  res.json({ ok: true });
});

// PATCH /api/driver/trips/:id/complete — mark trip as completed
router.patch('/trips/:id/complete', requireDriver, (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND driver_id = ?').get(req.params.id, req.driverId);
  if (!trip) return res.status(404).json({ error: 'Viaje no encontrado' });
  const { km } = req.body;
  db.prepare("UPDATE trips SET status = 'completed', fuel_used = COALESCE(?, fuel_used) WHERE id = ?").run(km || 0, req.params.id);
  // Update vehicle km if provided
  if (km && trip.vehicle_id) {
    db.prepare("UPDATE vehicles SET km = COALESCE(km, 0) + ? WHERE id = ?").run(km, trip.vehicle_id);
  }
  // Notification + activity log + socket
  db.prepare(`INSERT INTO notifications (type, title, message, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`)
    .run('trip_created', 'Viaje completado', `Viaje ${trip.trip_id} completado por conductor`, 'trip', trip.id);
  db.prepare(`INSERT INTO activity_log (action, description, entity_type, entity_id) VALUES (?, ?, ?, ?)`)
    .run('trip.completed', `Viaje ${trip.trip_id} completado por conductor`, 'trip', trip.id);
  try { req.app.get('io').emit('notification'); } catch(e) {}
  try { req.app.get('io').emit('trip:update'); } catch(e) {}
  res.json({ ok: true });
});

// POST /api/driver/location — report GPS point
router.post('/location', requireDriver, (req, res) => {
  const { lat, lng, trip_id } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: 'lat y lng requeridos' });
  // Store in a gps_points table
  db.prepare(`
    INSERT INTO gps_points (driver_id, trip_id, lat, lng, recorded_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(req.driverId, trip_id || null, lat, lng);
  res.json({ ok: true });
});

module.exports = router;
