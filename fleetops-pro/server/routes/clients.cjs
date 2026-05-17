const express = require('express');
const router = express.Router();
const db = require('../database.cjs');

// GET /api/clients — list all clients
router.get('/', (req, res) => {
  const clients = db.prepare(`
    SELECT * FROM clients ORDER BY name ASC
  `).all();
  res.json(clients);
});

// GET /api/clients/:id — single client with trip history
router.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const trips = db.prepare(`
    SELECT t.*, v.vehicle_id as v_id, d.name as driver_name
    FROM trips t
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN drivers d ON t.driver_id = d.id
    WHERE t.client_id = ?
    ORDER BY t.created_at DESC
    LIMIT 10
  `).all(req.params.id);

  res.json({ ...client, trips });
});

// POST /api/clients — create client
router.post('/', (req, res) => {
  const { name, email, phone, address, company, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO clients (name, email, phone, address, company, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, email || null, phone || null, address || null, company || null, notes || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

// PATCH /api/clients/:id — update client
router.patch('/:id', (req, res) => {
  const { name, email, phone, address, company, notes } = req.body;
  db.prepare(`
    UPDATE clients SET name=?, email=?, phone=?, address=?, company=?, notes=?, updated_at=datetime('now')
    WHERE id=?
  `).run(name, email || null, phone || null, address || null, company || null, notes || null, req.params.id);
  res.json({ ok: true });
});

// DELETE /api/clients/:id — delete client (nullifies trip references)
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(id);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const txn = db.transaction(() => {
    db.prepare("UPDATE trips SET client_id = NULL WHERE client_id = ?").run(id);
    db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  });
  txn();

  res.json({ ok: true });
});

module.exports = router;
