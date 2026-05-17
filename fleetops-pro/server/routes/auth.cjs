const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database.cjs');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const hash = crypto.createHash('sha256').update(password).digest('hex');
  if (hash !== user.password_hash) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // Generate simple session token
  const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
  });
});

// GET /api/auth/me — validate token and return user
router.get('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const decoded = Buffer.from(auth.slice(7), 'base64').toString('utf-8');
    const [userId] = decoded.split(':');
    const user = db.prepare('SELECT id, name, email, role, active FROM users WHERE id = ? AND active = 1').get(userId);
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;
