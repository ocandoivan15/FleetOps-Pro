const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database.cjs');

// POST /api/drivers/login
router.post('/login', (req, res) => {
  const { cedula, password } = req.body;
  if (!cedula || !password) {
    return res.status(400).json({ error: 'Cédula y contraseña requeridas' });
  }
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  const driver = db.prepare('SELECT id, name, cedula, license, phone, email, status, total_hours FROM drivers WHERE cedula = ? AND password_hash = ?').get(cedula, hash);
  if (!driver) {
    return res.status(401).json({ error: 'Cédula o contraseña incorrecta' });
  }
  // Set driver as on_duty
  db.prepare("UPDATE drivers SET status = 'on_duty', updated_at = datetime('now') WHERE id = ?").run(driver.id);
  driver.status = 'on_duty';

  // Notification + activity log + socket emit
  db.prepare(`INSERT INTO notifications (type, title, message, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`)
    .run('trip_created', 'Conductor en línea', `El conductor ${driver.name} ha iniciado sesión`, 'driver', driver.id);
  db.prepare(`INSERT INTO activity_log (action, description, entity_type, entity_id) VALUES (?, ?, ?, ?)`)
    .run('driver.online', `Conductor ${driver.name} inició sesión`, 'driver', driver.id);
  try { req.app.get('io').emit('notification'); } catch(e) {}
  try { req.app.get('io').emit('driver:update'); } catch(e) {}

  // Generate simple token (base64 of id:timestamp:hash)
  const token = Buffer.from(`${driver.id}:${Date.now()}:${hash.slice(0,8)}`).toString('base64');
  res.json({ token, driver });
});

// GET /api/drivers/me — validate token and return driver info
router.get('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const decoded = Buffer.from(auth.slice(7), 'base64').toString();
    const [id] = decoded.split(':');
    const driver = db.prepare('SELECT id, name, cedula, license, phone, email, status, total_hours FROM drivers WHERE id = ?').get(id);
    if (!driver) return res.status(401).json({ error: 'Token inválido' });
    res.json(driver);
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;
