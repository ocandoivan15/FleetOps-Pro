const express = require('express');
const router = express.Router();
const db = require('../database.cjs');

router.get('/', (req, res) => {
  const activities = db.prepare(`
    SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 100
  `).all();
  res.json(activities);
});

module.exports = router;
