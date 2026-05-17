const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database.cjs');

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

// GET /api/users — list all users
router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, active, created_at FROM users ORDER BY id').all();
  res.json(users);
});

// POST /api/users — create user
router.post('/', (req, res) => {
  const { name, email, password, role = 'operator' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña requeridos' });
  }
  if (!['admin', 'operator', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  try {
    const hash = hashPassword(password);
    const result = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(name, email, hash, role);
    res.json({ id: result.lastInsertRowid, name, email, role });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/users/:id — update user
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, active } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' });

  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (email !== undefined) { updates.push('email = ?'); params.push(email); }
  if (role !== undefined) {
    if (!['admin', 'operator', 'viewer'].includes(role)) return res.status(400).json({ error: 'Rol inválido' });
    updates.push('role = ?'); params.push(role);
  }
  if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }
  if (password) {
    updates.push('password_hash = ?'); params.push(hashPassword(password));
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });

  updates.push("updated_at = datetime('now')");
  params.push(id);

  try {
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    const user = db.prepare('SELECT id, name, email, role, active FROM users WHERE id = ?').get(id);
    res.json(user);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email ya en uso' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/users/:id — delete user (prevent deleting last admin)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (user.role === 'admin') {
    const adminCount = db.prepare('SELECT COUNT(*) as c FROM users WHERE role = ?').get('admin');
    if (adminCount.c <= 1) return res.status(400).json({ error: 'No se puede eliminar el último administrador' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
