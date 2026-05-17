const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

module.exports = function(db) {
  // GET all settings as { key: value }
  router.get('/', (req, res) => {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json(settings);
  });

  // PUT bulk update settings
  router.put('/', (req, res) => {
    const updates = req.body;
    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        upsert.run(key, String(value));
      }
    });
    tx();
    res.json({ ok: true });
  });

  // POST upload logo
  router.post('/logo', (req, res) => {
    // logo comes as base64 in JSON body: { data: "data:image/png;base64,..." }
    const { data } = req.body;
    if (!data || !data.startsWith('data:image')) {
      return res.status(400).json({ error: 'Se requiere una imagen en formato base64' });
    }
    const matches = data.match(/^data:image\/(png|jpg|jpeg|webp);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Formato de imagen no soportado' });
    }
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const publicDir = path.join(__dirname, '..', '..', 'public');
    const filename = `logo-custom.${ext}`;
    const filepath = path.join(publicDir, filename);
    fs.writeFileSync(filepath, buffer);
    // Save filename in settings
    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    upsert.run('logo_filename', filename);
    res.json({ ok: true, filename });
  });

  // GET export data
  router.get('/export', (req, res) => {
    const tables = ['vehicles', 'drivers', 'trips', 'maintenance', 'clients', 'fleet_stats', 'maintenance_checklist'];
    const dump = {};
    for (const table of tables) {
      try {
        dump[table] = db.prepare(`SELECT * FROM ${table}`).all();
      } catch(e) {
        dump[table] = [];
      }
    }
    dump.settings = db.prepare('SELECT key, value FROM settings').all();
    res.json(dump);
  });

  // POST reset seed data
  router.post('/reset', (req, res) => {
    const tables = ['trips', 'maintenance', 'maintenance_checklist', 'fleet_stats', 'clients', 'drivers', 'vehicles'];
    const tx = db.transaction(() => {
      for (const t of tables) {
        db.prepare(`DELETE FROM ${t}`).run();
      }
    });
    tx();
    // Re-run seed by deleting vehicles table content — database.cjs seeds when vehicles is empty
    // The seed runs at startup, so we just clear and tell user to restart
    res.json({ ok: true, message: 'Datos de prueba eliminados. Reiniciá el servidor para regenerarlos.' });
  });

  return router;
};
