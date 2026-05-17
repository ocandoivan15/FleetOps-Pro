const express = require('express');
const router = express.Router();
const db = require('../database.cjs');

// GET /api/drivers — list all drivers
router.get('/', (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let sql = 'SELECT * FROM drivers WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  const { total } = db.prepare(sql.replace(/SELECT \*/i, 'SELECT COUNT(*) as total')).get(...params);
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  const drivers = db.prepare(sql).all(...params);

  const statusMap = {
    on_duty: { label: 'En Servicio', class: 'bg-green-50 text-green-700', icon: 'radio_button_checked' },
    rest: { label: 'Descanso', class: 'bg-amber-50 text-amber-700', icon: 'history_toggle_off' },
    off_duty: { label: 'Fuera de Servicio', class: 'bg-surface-container-highest text-on-surface-variant', icon: 'do_not_disturb_on' },
    critical: { label: 'Crítico', class: 'bg-red-50 text-error', icon: 'error' },
  };

  res.json({
    data: drivers.map(d => ({
      ...d,
      statusInfo: statusMap[d.status] || { label: d.status, class: '', icon: 'help' },
      bar: Math.min(100, (d.total_hours / 208) * 100),
    })),
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  });
});

// GET /api/drivers/live — active drivers with GPS + trip info
router.get('/live', (req, res) => {
  const drivers = db.prepare(`
    SELECT
      d.id, d.name, d.cedula, d.status,
      t.id as trip_id, t.trip_id as trip_code, t.route_name, t.status as trip_status,
      g.lat, g.lng, g.recorded_at as last_gps_time
    FROM drivers d
    LEFT JOIN trips t ON t.driver_id = d.id AND t.status IN ('in_progress', 'pending')
    LEFT JOIN (
      SELECT driver_id, lat, lng, recorded_at
      FROM gps_points
      WHERE id IN (SELECT MAX(id) FROM gps_points GROUP BY driver_id)
    ) g ON g.driver_id = d.id
    WHERE d.status IN ('on_duty', 'critical')
    ORDER BY d.name
  `).all();
  res.json(drivers);
});

// GET /api/drivers/stats — driver aggregate stats
router.get('/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'on_duty' THEN 1 ELSE 0 END) as on_duty,
      SUM(CASE WHEN status = 'rest' THEN 1 ELSE 0 END) as rest,
      SUM(CASE WHEN status = 'critical' THEN 1 ELSE 0 END) as critical
    FROM drivers
  `).get();
  res.json(stats);
});

// GET /api/drivers/available — available drivers for assignment
router.get('/available', (req, res) => {
  const drivers = db.prepare(`
    SELECT id, name, license FROM drivers WHERE status IN ('on_duty','off_duty')
    ORDER BY name ASC
  `).all();
  res.json(drivers);
});

// POST /api/drivers — add new driver
router.post('/', (req, res) => {
  const { name, email, cedula, license, phone } = req.body;
  const result = db.prepare(`
    INSERT INTO drivers (name, email, cedula, license, phone) VALUES (?, ?, ?, ?, ?)
  `).run(name, email, cedula || null, license, phone || null);

  // Activity log
  db.prepare(`INSERT INTO activity_log (action, description, entity_type, entity_id) VALUES (?, ?, ?, ?)`)
    .run('driver.created', `Conductor ${name} agregado`, 'driver', result.lastInsertRowid);

  res.status(201).json({ id: result.lastInsertRowid });
});

// PATCH /api/drivers/:id — update driver
router.patch('/:id', (req, res) => {
  const { name, email, cedula, license, phone, status, total_hours } = req.body;
  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (email !== undefined) { updates.push('email = ?'); params.push(email); }
  if (cedula !== undefined) { updates.push('cedula = ?'); params.push(cedula); }
  if (license !== undefined) { updates.push('license = ?'); params.push(license); }
  if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
  if (status) { updates.push('status = ?'); params.push(status); }
  if (total_hours !== undefined) { updates.push('total_hours = ?'); params.push(total_hours); }
  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);

  db.prepare(`UPDATE drivers SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  // Notify: driver status changed to critical
  if (status === 'critical') {
    const driver = db.prepare('SELECT name FROM drivers WHERE id = ?').get(req.params.id);
    if (driver) {
      db.prepare(`INSERT INTO notifications (type, title, message, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`)
        .run('driver_critical', 'Conductor crítico', `El conductor ${driver.name} está en estado crítico`, 'driver', req.params.id);

      // Activity log
      db.prepare(`INSERT INTO activity_log (action, description, entity_type, entity_id) VALUES (?, ?, ?, ?)`)
        .run('driver.critical', `Conductor ${driver.name} en estado crítico`, 'driver', req.params.id);
    }
  }

  res.json({ ok: true });
});

// DELETE /api/drivers/:id — delete driver (nullifies trip references)
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const driver = db.prepare('SELECT id, name FROM drivers WHERE id = ?').get(id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  // Activity log
  db.prepare(`INSERT INTO activity_log (action, description, entity_type, entity_id) VALUES (?, ?, ?, ?)`)
    .run('driver.deleted', `Conductor ${driver.name} eliminado`, 'driver', id);

  const txn = db.transaction(() => {
    db.prepare("UPDATE trips SET driver_id = NULL WHERE driver_id = ?").run(id);
    db.prepare("DELETE FROM drivers WHERE id = ?").run(id);
  });
  txn();

  res.json({ ok: true });
});

module.exports = router;
