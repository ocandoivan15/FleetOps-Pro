const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./database.cjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
});

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Socket.IO connection
io.on('connection', (socket) => {
  console.log(`⚡ Cliente conectado: ${socket.id}`);
  socket.on('disconnect', () => console.log(`⚡ Cliente desconectado: ${socket.id}`));
});

// API routes
app.use('/api/trips', require('./routes/trips.cjs'));
app.use('/api/fleet', require('./routes/fleet.cjs'));
app.use('/api/drivers', require('./routes/drivers.cjs'));
app.use('/api/drivers', require('./routes/driver-auth.cjs'));
app.use('/api/clients', require('./routes/clients.cjs'));
app.use('/api/settings', require('./routes/settings.cjs')(db));
app.use('/api/auth', require('./routes/auth.cjs'));
app.use('/api/users', require('./routes/users.cjs'));
app.use('/api/notifications', require('./routes/notifications.cjs'));
app.use('/api/activity', require('./routes/activity.cjs'));
app.use('/api/driver', require('./routes/driver-trips.cjs'));

// Serve root public folder (logos, etc.)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve driver app (built PWA) — always available
const driverDist = path.join(__dirname, '..', 'driver-app', 'dist');
if (fs.existsSync(driverDist)) {
  app.use('/driver', express.static(driverDist));
  app.use('/driver', (req, res) => {
    res.sendFile(path.join(driverDist, 'index.html'));
  });
  console.log(`✓ Driver app served at /driver`);
} else {
  console.log('⚠ Driver app not built — run: cd driver-app && npm run build');
}

// Serve admin app (production only, dev uses Vite)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`✓ FleetOps API running at http://localhost:${PORT}`);
  console.log(`⚡ WebSocket running`);
});
