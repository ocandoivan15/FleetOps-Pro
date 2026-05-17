const express = require('express');
const router = express.Router();
const db = require('../database.cjs');

// GET /api/trips — list all trips with vehicle & driver info
router.get('/', (req, res) => {
  const { status, search, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT t.*, v.vehicle_id as v_id, v.plate, v.model,
           d.name as driver_name, d.license as driver_license,
           c.name as client_name, c.company as client_company
    FROM trips t
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN drivers d ON t.driver_id = d.id
    LEFT JOIN clients c ON t.client_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    const statuses = status.split(',').map(s => s.trim()).filter(Boolean)
    if (statuses.length > 1) {
      sql += ` AND t.status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    } else {
      sql += ' AND t.status = ?';
      params.push(status);
    }
  }
  if (search) {
    sql += ' AND (t.trip_id LIKE ? OR t.route_name LIKE ? OR d.name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const countSql = sql.replace(/SELECT t\.\*.*FROM/, 'SELECT COUNT(*) as total FROM');
  const { total } = db.prepare(countSql).get(...params);

  sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  const trips = db.prepare(sql).all(...params);

  // Map status to display
  const statusMap = {
    on_time: { label: 'A TIEMPO', class: 'bg-green-50 text-green-700 border-green-200', icon: 'check_circle' },
    delayed: { label: 'RETRASADO', class: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'schedule' },
    completed: { label: 'COMPLETADO', class: 'bg-surface-container text-on-surface-variant border-outline-variant', icon: 'task_alt' },
    pending: { label: 'PENDIENTE', class: 'bg-primary-fixed text-on-primary-fixed border-outline-variant', icon: 'pending' },
    in_progress: { label: 'EN CURSO', class: 'bg-green-100 text-green-800', icon: 'radio_button_checked' },
  };

  res.json({
    data: trips.map(t => ({
      ...t,
      statusInfo: statusMap[t.status] || { label: t.status, class: '', icon: 'help' },
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// GET /api/trips/stats — aggregate stats for dashboard
router.get('/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_trips,
      SUM(CASE WHEN status IN ('on_time','in_progress') THEN 1 ELSE 0 END) as active_trips,
      ROUND(AVG(CASE WHEN status = 'on_time' THEN 100.0 ELSE 0 END), 1) as on_time_rate,
      SUM(CASE WHEN status = 'delayed' THEN 1 ELSE 0 END) as delayed_trips
    FROM trips
  `).get();

  const today = new Date().toISOString().split('T')[0];
  const todayTrips = db.prepare(`
    SELECT COUNT(*) as c FROM trips WHERE date(created_at) = ?
  `).get(today);

  res.json({ ...stats, today_trips: todayTrips.c });
});

// POST /api/trips — create new trip
router.post('/', (req, res) => {
  const { route_name, route_desc, scheduled_time, origin, destination, vehicle_id, driver_id, client_id, trip_type, passengers, origin_lat, origin_lng, origin_name, dest_lat, dest_lng, dest_name } = req.body;
  const prefix = 'TRP-';
  const count = db.prepare('SELECT COUNT(*) as c FROM trips').get().c;
  const trip_id = `${prefix}${String(count + 1).padStart(4, '0')}`;

  const result = db.prepare(`
    INSERT INTO trips (trip_id, vehicle_id, driver_id, client_id, route_name, route_desc, scheduled_time, status, origin, destination, trip_type, passengers, origin_lat, origin_lng, origin_name, dest_lat, dest_lng, dest_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(trip_id, vehicle_id || null, driver_id || null, client_id || null, route_name, route_desc, scheduled_time, origin, destination, trip_type || 'one_way', passengers || 0, origin_lat || null, origin_lng || null, origin_name || null, dest_lat || null, dest_lng || null, dest_name || null);

  // Update client's total_trips count
  if (client_id) {
    db.prepare('UPDATE clients SET total_trips = total_trips + 1, last_trip_date = datetime(\'now\') WHERE id = ?').run(client_id);
  }

  // Notify: new trip created
  db.prepare(`INSERT INTO notifications (type, title, message, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`)
    .run('trip_created', 'Nuevo viaje', `Viaje ${trip_id} creado - ${route_name}`, 'trip', result.lastInsertRowid);

  // Activity log
  db.prepare(`INSERT INTO activity_log (action, description, entity_type, entity_id) VALUES (?, ?, ?, ?)`)
    .run('trip.created', `Viaje ${trip_id} creado - ${route_name}`, 'trip', result.lastInsertRowid);

  try { req.app.get('io').emit('notification'); } catch(e) {}
  try { req.app.get('io').emit('trip:update'); } catch(e) {}

  res.status(201).json({ id: result.lastInsertRowid, trip_id });
});

// PATCH /api/trips/:id — update trip (status, driver, client, etc.)
router.patch('/:id', (req, res) => {
  const { status, actual_departure, fuel_used, driver_id, client_id, vehicle_id, trip_type, passengers, route_name, route_desc, scheduled_time, origin, destination, origin_name, dest_name } = req.body;
  const updates = [];
  const params = [];

  if (status) { updates.push('status = ?'); params.push(status); }
  if (actual_departure) { updates.push('actual_departure = ?'); params.push(actual_departure); }
  if (fuel_used !== undefined) { updates.push('fuel_used = ?'); params.push(fuel_used); }
  if (driver_id !== undefined) { updates.push('driver_id = ?'); params.push(driver_id === null ? null : Number(driver_id)); }
  if (client_id !== undefined) { updates.push('client_id = ?'); params.push(client_id === null ? null : Number(client_id)); }
  if (vehicle_id !== undefined) { updates.push('vehicle_id = ?'); params.push(vehicle_id === null ? null : Number(vehicle_id)); }
  if (trip_type !== undefined) { updates.push('trip_type = ?'); params.push(trip_type); }
  if (passengers !== undefined) { updates.push('passengers = ?'); params.push(passengers); }
  if (route_name !== undefined) { updates.push('route_name = ?'); params.push(route_name); }
  if (route_desc !== undefined) { updates.push('route_desc = ?'); params.push(route_desc); }
  if (scheduled_time !== undefined) { updates.push('scheduled_time = ?'); params.push(scheduled_time); }
  if (origin !== undefined) { updates.push('origin = ?'); params.push(origin); }
  if (destination !== undefined) { updates.push('destination = ?'); params.push(destination); }
  if (origin_name !== undefined) { updates.push('origin_name = ?'); params.push(origin_name); }
  if (dest_name !== undefined) { updates.push('dest_name = ?'); params.push(dest_name); }
  updates.push("updated_at = datetime('now')");

  params.push(req.params.id);
  db.prepare(`UPDATE trips SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  // Notify: trip delayed
  if (status === 'delayed') {
    const trip = db.prepare('SELECT trip_id FROM trips WHERE id = ?').get(req.params.id);
    if (trip) {
      db.prepare(`INSERT INTO notifications (type, title, message, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`)
        .run('trip_delayed', 'Viaje retrasado', `El viaje ${trip.trip_id} está retrasado`, 'trip', req.params.id);

      // Activity log
      db.prepare(`INSERT INTO activity_log (action, description, entity_type, entity_id) VALUES (?, ?, ?, ?)`)
        .run('trip.delayed', `Viaje ${trip.trip_id} marcado como retrasado`, 'trip', req.params.id);

      try { req.app.get('io').emit('notification'); } catch(e) {}
    }
  }

  res.json({ ok: true });
});

// PATCH /api/trips/:id/assign-driver — shortcut for assigning driver
router.patch('/:id/assign-driver', (req, res) => {
  const { driver_id } = req.body;
  db.prepare("UPDATE trips SET driver_id = ?, updated_at = datetime('now') WHERE id = ?").run(driver_id || null, req.params.id);

  // Activity log
  const trip = db.prepare('SELECT trip_id FROM trips WHERE id = ?').get(req.params.id);
  if (trip) {
    db.prepare(`INSERT INTO activity_log (action, description, entity_type, entity_id) VALUES (?, ?, ?, ?)`)
      .run('trip.assigned', `Viaje ${trip.trip_id} asignado a conductor`, 'trip', req.params.id);
  }

  res.json({ ok: true });
});

// GET /api/trips/unassigned — trips without driver
router.get('/unassigned', (req, res) => {
  const trips = db.prepare(`
    SELECT t.*, v.vehicle_id as v_id, c.name as client_name
    FROM trips t
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN clients c ON t.client_id = c.id
    WHERE t.driver_id IS NULL AND t.status IN ('pending', 'in_progress')
    ORDER BY t.scheduled_time ASC
  `).all();
  res.json(trips);
});

module.exports = router;
