const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/trips', require('./routes/trips.cjs'));
app.use('/api/fleet', require('./routes/fleet.cjs'));
app.use('/api/drivers', require('./routes/drivers.cjs'));
app.use('/api/clients', require('./routes/clients.cjs'));
app.use('/api/settings', require('./routes/settings.cjs')(db));
app.use('/api/auth', require('./routes/auth.cjs'));
app.use('/api/users', require('./routes/users.cjs'));

// In development, don't serve static files (Vite dev server handles it)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✓ FleetOps API running at http://localhost:${PORT}`);
});
