const express = require('express');
const router = express.Router();
const db = require('../database.cjs');

// GET /api/notifications — list recent notifications
router.get('/', (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50
  `).all();
  res.json(notifications);
});

// GET /api/notifications/unread-count — count of unread notifications
router.get('/unread-count', (req, res) => {
  const { count } = db.prepare(`
    SELECT COUNT(*) as count FROM notifications WHERE read = 0
  `).get();
  res.json({ count });
});

// PATCH /api/notifications/:id/read — mark single notification as read
router.patch('/:id/read', (req, res) => {
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// PATCH /api/notifications/read-all — mark ALL as read
router.patch('/read-all', (req, res) => {
  db.prepare("UPDATE notifications SET read = 1 WHERE read = 0").run();
  res.json({ ok: true });
});

module.exports = router;
