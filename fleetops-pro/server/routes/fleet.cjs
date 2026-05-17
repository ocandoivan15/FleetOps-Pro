const express = require('express');
const router = express.Router();
const db = require('../database.cjs');

// GET /api/fleet — list all vehicles
router.get('/', (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let sql = 'SELECT * FROM vehicles WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  const { total } = db.prepare(sql.replace(/SELECT \*/i, 'SELECT COUNT(*) as total')).get(...params);
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  const vehicles = db.prepare(sql).all(...params);

  const statusMap = {
    active: { label: 'Activo', class: 'bg-secondary/10 text-secondary', icon: 'circle' },
    maintenance: { label: 'En Taller', class: 'bg-error/10 text-error', icon: 'build' },
    inactive: { label: 'Inactivo', class: 'bg-outline-variant/30 text-outline', icon: 'cancel' },
    out_of_service: { label: 'Fuera de Servicio', class: 'bg-outline-variant/30 text-outline', icon: 'cancel' },
  };

  res.json({
    data: vehicles.map(v => ({
      ...v,
      statusInfo: statusMap[v.status] || { label: v.status, class: '', icon: 'help' },
    })),
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  });
});

// GET /api/fleet/stats — fleet distribution & counts
router.get('/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
      SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
      ROUND(AVG(CASE WHEN status = 'active' THEN fuel_efficiency ELSE NULL END), 1) as avg_fuel_efficiency
    FROM vehicles
  `).get();

  res.json(stats);
});

// GET /api/fleet/maintenance — upcoming maintenance
router.get('/maintenance', (req, res) => {
  const items = db.prepare(`
    SELECT m.*, v.vehicle_id as v_id, v.plate, v.model
    FROM maintenance m
    LEFT JOIN vehicles v ON m.vehicle_id = v.id
    ORDER BY m.scheduled_date ASC
  `).all();
  res.json(items);
});

// POST /api/fleet — add new vehicle
router.post('/', (req, res) => {
  const { vehicle_id, plate, model, year, type, km, capacity } = req.body;
  const result = db.prepare(`
    INSERT INTO vehicles (vehicle_id, plate, model, year, type, km, capacity) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(vehicle_id, plate, model, year || null, type || 'bus', km != null ? km : 0, capacity != null ? capacity : 40);
  res.status(201).json({ id: result.lastInsertRowid });
});

// GET /api/fleet/:id — single vehicle with maintenance history + checklist
router.get('/:id', (req, res) => {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const maintenance = db.prepare(`
    SELECT * FROM maintenance WHERE vehicle_id = ? ORDER BY scheduled_date DESC
  `).all(req.params.id);

  const maintenanceWithChecklist = maintenance.map(m => {
    const checklist = db.prepare('SELECT * FROM maintenance_checklist WHERE maintenance_id = ? ORDER BY id ASC').all(m.id);
    return { ...m, checklist };
  });

  const trips = db.prepare(`
    SELECT t.*, d.name as driver_name, c.name as client_name
    FROM trips t
    LEFT JOIN drivers d ON t.driver_id = d.id
    LEFT JOIN clients c ON t.client_id = c.id
    WHERE t.vehicle_id = ?
    ORDER BY t.created_at DESC
    LIMIT 20
  `).all(req.params.id);

  res.json({ ...vehicle, maintenance: maintenanceWithChecklist, trips });
});

// POST /api/fleet/:id/send-to-taller — send vehicle to workshop with checklist
router.post('/:id/send-to-taller', (req, res) => {
  const { id } = req.params;
  const { checklist, reason, explanation, type, km } = req.body;

  const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const typeLabel = type === 'reparacion' ? 'Reparación' : 'Mantenimiento';
  const itemsText = checklist && checklist.length > 0 ? checklist.join(', ') : '';
  const kmText = km ? `${km.toLocaleString()} km` : '';
  const parts = [itemsText, kmText, reason, explanation].filter(Boolean);
  const desc = `[${typeLabel}] ${parts.join(' — ') || 'Envío a taller'}`;

  const txn = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO maintenance (vehicle_id, description, scheduled_date, priority, status, km)
      VALUES (?, ?, datetime('now'), 'high', 'in_progress', ?)
    `).run(id, desc, km || null);

    const maintId = result.lastInsertRowid;

    if (checklist && checklist.length > 0) {
      const insertItem = db.prepare('INSERT INTO maintenance_checklist (maintenance_id, item) VALUES (?, ?)');
      for (const item of checklist) {
        insertItem.run(maintId, item);
      }
    }

    db.prepare("UPDATE vehicles SET status = 'maintenance', updated_at = datetime('now') WHERE id = ?").run(id);
  });
  txn();

  res.json({ ok: true });
});

// PATCH /api/fleet/maintenance/:maintId/checklist/:itemId — toggle checklist item
router.patch('/maintenance/:maintId/checklist/:itemId', (req, res) => {
  const { checked } = req.body;
  db.prepare("UPDATE maintenance_checklist SET checked = ? WHERE id = ?").run(checked ? 1 : 0, req.params.itemId);
  res.json({ ok: true });
});

// PATCH /api/fleet/:id — update vehicle
router.patch('/:id', (req, res) => {
  const { vehicle_id, plate, model, year, type, status, fuel_efficiency } = req.body;
  const updates = [];
  const params = [];

  if (vehicle_id !== undefined) { updates.push('vehicle_id = ?'); params.push(vehicle_id); }
  if (plate !== undefined) { updates.push('plate = ?'); params.push(plate); }
  if (model !== undefined) { updates.push('model = ?'); params.push(model); }
  if (year !== undefined) { updates.push('year = ?'); params.push(year); }
  if (type !== undefined) { updates.push('type = ?'); params.push(type); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (fuel_efficiency !== undefined) { updates.push('fuel_efficiency = ?'); params.push(fuel_efficiency); }
  if (km !== undefined) { updates.push('km = ?'); params.push(km); }
  if (capacity !== undefined) { updates.push('capacity = ?'); params.push(capacity); }
  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);

  db.prepare(`UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

// DELETE /api/fleet/:id — delete vehicle (nullifies trip references)
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const vehicle = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const txn = db.transaction(() => {
    db.prepare("UPDATE trips SET vehicle_id = NULL WHERE vehicle_id = ?").run(id);
    db.prepare("DELETE FROM maintenance WHERE vehicle_id = ?").run(id);
    db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
  });
  txn();

  res.json({ ok: true });
});

module.exports = router;
