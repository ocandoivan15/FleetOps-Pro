const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'data', 'fleetops.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT UNIQUE NOT NULL,
    plate TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    status TEXT CHECK(status IN ('active','maintenance','inactive','out_of_service')) DEFAULT 'active',
    fuel_efficiency REAL DEFAULT 3.2,
    type TEXT DEFAULT 'bus',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    license TEXT NOT NULL,
    phone TEXT,
    status TEXT CHECK(status IN ('on_duty','rest','off_duty','critical')) DEFAULT 'off_duty',
    total_hours REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id TEXT UNIQUE NOT NULL,
    vehicle_id INTEGER REFERENCES vehicles(id),
    driver_id INTEGER REFERENCES drivers(id),
    route_name TEXT NOT NULL,
    route_desc TEXT,
    scheduled_time TEXT,
    actual_departure TEXT,
    status TEXT CHECK(status IN ('on_time','delayed','completed','pending','in_progress')) DEFAULT 'pending',
    origin TEXT,
    destination TEXT,
    client_id INTEGER REFERENCES clients(id),
    fuel_used REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER REFERENCES vehicles(id),
    description TEXT NOT NULL,
    scheduled_date TEXT,
    priority TEXT CHECK(priority IN ('low','medium','high','critical')) DEFAULT 'medium',
    status TEXT CHECK(status IN ('pending','in_progress','completed')) DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    company TEXT,
    notes TEXT,
    total_trips INTEGER DEFAULT 0,
    last_trip_date TEXT,
    last_lat REAL,
    last_lng REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migration: add client_id for databases created before the column existed
try { db.exec("ALTER TABLE trips ADD COLUMN client_id INTEGER REFERENCES clients(id)"); } catch(e) {}

// Migration: add km columns
try { db.exec("ALTER TABLE maintenance ADD COLUMN km INTEGER"); } catch(e) {}
try { db.exec("ALTER TABLE vehicles ADD COLUMN km INTEGER DEFAULT 0"); } catch(e) {}
try { db.exec("ALTER TABLE vehicles ADD COLUMN capacity INTEGER DEFAULT 40"); } catch(e) {}
try { db.exec("ALTER TABLE trips ADD COLUMN trip_type TEXT DEFAULT 'one_way'"); } catch(e) {}
try { db.exec("ALTER TABLE trips ADD COLUMN passengers INTEGER DEFAULT 0"); } catch(e) {}
try { db.exec("ALTER TABLE trips ADD COLUMN origin_lat REAL"); } catch(e) {}
try { db.exec("ALTER TABLE trips ADD COLUMN origin_lng REAL"); } catch(e) {}
try { db.exec("ALTER TABLE trips ADD COLUMN origin_name TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE trips ADD COLUMN dest_lat REAL"); } catch(e) {}
try { db.exec("ALTER TABLE trips ADD COLUMN dest_lng REAL"); } catch(e) {}
try { db.exec("ALTER TABLE trips ADD COLUMN dest_name TEXT"); } catch(e) {}

// Settings table
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

// Migration: maintenance checklist table
db.exec(`
  CREATE TABLE IF NOT EXISTS maintenance_checklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    maintenance_id INTEGER REFERENCES maintenance(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    checked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS fleet_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    active_trips INTEGER DEFAULT 0,
    on_time_rate REAL DEFAULT 0,
    active_drivers INTEGER DEFAULT 0,
    utilization REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin','operator','viewer')) DEFAULT 'operator',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// ---------------------------------------------------------------------------
// Seed default settings (if empty)
// ---------------------------------------------------------------------------
const settingCount = db.prepare('SELECT COUNT(*) as c FROM settings').get().c;

if (settingCount === 0) {
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const defaultSettings = [
    ['company_name', 'Transportes FleetOps'],
    ['company_address', 'Av. Principal, Maracaibo'],
    ['company_phone', '555-0000'],
    ['company_email', 'info@fleetops.pro'],
    ['default_trip_type', 'one_way'],
    ['default_passenger_count', '40'],
    ['bus_default_capacity', '50'],
    ['electric_default_capacity', '80'],
    ['van_default_capacity', '15'],
    ['map_lat', '10.6549'],
    ['map_lng', '-71.6521'],
    ['theme', 'light'],
    ['checklist_items', JSON.stringify([
      'Nivel de aceite',
      'Presión de neumáticos',
      'Sistema de frenos',
      'Luces y señalización',
      'Nivel de refrigerante',
      'Batería y sistema eléctrico',
      'Filtro de aire',
      'Correas y mangueras',
      'Limpiaparabrisas',
      'Sistema de escape'
    ])],
  ];
  for (const [k, v] of defaultSettings) {
    insertSetting.run(k, v);
  }
  console.log('✓ Default settings seeded');
}

// ---------------------------------------------------------------------------
// Seed admin user (if empty)
// ---------------------------------------------------------------------------
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;

if (userCount === 0) {
  const hash = crypto.createHash('sha256').update('admin123').digest('hex');
  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(
    'Administrador', 'admin@fleetops.pro', hash, 'admin'
  );
  console.log('✓ Admin user seeded (admin@fleetops.pro / admin123)');
}

// ---------------------------------------------------------------------------
// Seed data (only if empty)
// ---------------------------------------------------------------------------
const vehicleCount = db.prepare('SELECT COUNT(*) as c FROM vehicles').get().c;

if (vehicleCount === 0) {
  const insertVehicle = db.prepare(`
    INSERT INTO vehicles (vehicle_id, plate, model, year, status, fuel_efficiency, type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const vehicles = [
    ['BUS-0842', 'ABC-1234', 'Volvo 7900 Hybrid', 2023, 'active', 4.1, 'bus'],
    ['BUS-0115', 'XYZ-9876', 'Mercedes-Benz Citaro', 2022, 'maintenance', 3.8, 'bus'],
    ['BUS-0552', 'LMN-4567', "MAN Lion's City E", 2024, 'active', 2.5, 'electric'],
    ['BUS-0229', 'JKL-3344', 'BYD K9 Electric', 2021, 'out_of_service', 2.1, 'electric'],
    ['VAN-4421', 'DEF-5678', 'Ford Transit 350', 2023, 'active', 5.2, 'van'],
    ['BUS-0992', 'GHI-9012', 'Volvo 7900 Hybrid', 2023, 'active', 4.0, 'bus'],
    ['BUS-0431', 'JKL-3456', 'Scania Citywide', 2022, 'active', 3.9, 'bus'],
    ['BUS-1201', 'MNO-7890', 'Mercedes-Benz Citaro', 2024, 'active', 3.7, 'bus'],
  ];

  for (const v of vehicles) {
    insertVehicle.run(...v);
  }

  const insertDriver = db.prepare(`
    INSERT INTO drivers (name, email, license, phone, status, total_hours)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const drivers = [
    ['Marcus Chen', 'marcus.chen@fleetops.pro', 'TX-992-B8841', '555-0101', 'on_duty', 164.5],
    ['Sarah Jenkins', 'sarah.jenkins@fleetops.pro', 'FL-112-D0092', '555-0102', 'rest', 192.0],
    ['David Miller', 'david.miller@fleetops.pro', 'CA-556-C1123', '555-0103', 'on_duty', 45.2],
    ['Elena Rodriguez', 'elena.rodriguez@fleetops.pro', 'NY-778-F3321', '555-0104', 'on_duty', 208.1],
    ['Marcus Sterling', 'marcus.sterling@fleetops.pro', 'TX-992-B8841', '555-0105', 'on_duty', 164.5],
    ['Jameson Wu', 'jameson.wu@fleetops.pro', 'NY-556-C1123', '555-0106', 'off_duty', 45.2],
    ['Carlos Mendez', 'carlos.mendez@fleetops.pro', 'CA-778-F3321', '555-0107', 'critical', 208.1],
    ['Elena Rossi', 'elena.rossi@fleetops.pro', 'IL-334-D5566', '555-0108', 'rest', 120.3],
    ['James Wilson', 'james.wilson@fleetops.pro', 'WA-221-E7788', '555-0109', 'on_duty', 89.7],
    ['Robert Chen', 'robert.chen@fleetops.pro', 'OR-113-F9900', '555-0110', 'on_duty', 145.2],
  ];

  for (const d of drivers) {
    insertDriver.run(...d);
  }

  const insertClient = db.prepare(`
    INSERT INTO clients (name, email, phone, address, company, notes, total_trips, last_trip_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const clients = [
    ['Transportes del Norte S.A.', 'contacto@tdnorte.com', '555-1001', 'Av. Principal 1234, Sector Norte', 'Transportes del Norte', 'Cliente corporativo - contrato anual', 24, '2026-05-10'],
    ['Municipalidad de Centro', 'transporte@municentro.gov', '555-1002', 'Palacio Municipal, Plaza Mayor', 'Gobierno Local', 'Servicio de transporte público', 89, '2026-05-12'],
    ['Hotel Grand Central', 'concierge@grandcentral.com', '555-1003', 'Calle del Sol 567, Zona Hotelera', 'Hotelería', 'Traslados aeropuerto para huéspedes', 156, '2026-05-11'],
    ['Colegio San Miguel', 'admin@sanmiguel.edu', '555-1004', 'Av. Educación 890, Colina Verde', 'Educación', 'Ruta escolar matutina y vespertina', 312, '2026-05-12'],
    ['Centro Comercial Plaza Mayor', 'logistica@plazamayor.com', '555-1005', 'Av. Comercial 456, Zona Centro', 'Comercio', 'Shuttle para clientes del centro comercial', 45, '2026-05-09'],
    ['Aeropuerto Internacional', 'ground@airport.com', '555-1006', 'Terminal 2, Aeropuerto Intl.', 'Transporte', 'Servicio de conexión entre terminales', 678, '2026-05-12'],
    ['Hospital General', 'logistica@hospitalgeneral.com', '555-1007', 'Av. Salud 234, Sector Médico', 'Salud', 'Transporte de personal médico', 201, '2026-05-11'],
    ['TechPark Industrias', 'recepcion@techpark.com', '555-1008', 'Parque Industrial 789, Zona Sur', 'Industria', 'Transporte de empleados turnos', 88, '2026-05-10'],
  ];

  for (const c of clients) {
    insertClient.run(...c);
  }

  const insertTrip = db.prepare(`
    INSERT INTO trips (trip_id, vehicle_id, driver_id, route_name, route_desc, scheduled_time, actual_departure, status, origin, destination, fuel_used)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const trips = [
    ['TRP-8821', 1, 1, 'Exprés Norte-Sur', 'Puerta B12 → Hub Central', '08:30 AM', '08:32 AM', 'on_time', 'Puerta B12', 'Hub Central', 72],
    ['TRP-9042', 5, 2, 'Circuito Centro', 'Plaza Circular → 5ª Ave', '09:15 AM', '09:28 AM', 'delayed', 'Plaza Circular', '5ª Ave', 38],
    ['TRP-7734', 3, 5, 'Conexión Aeropuerto', 'Terminal Este → Aeropuerto Intl.', '07:00 AM', '07:01 AM', 'completed', 'Terminal Este', 'Aeropuerto Intl.', 88],
    ['TRP-8120', 6, 4, 'Ruta Rivereña', 'Bahía Marina → Muelle Norte', '10:00 AM', null, 'pending', 'Bahía Marina', 'Muelle Norte', 0],
    ['TRP-9011', 7, 9, 'Exprés Norte-Sur', 'Hub Central → Puerta B12', '11:00 AM', null, 'pending', 'Hub Central', 'Puerta B12', 0],
    ['TRP-9210', 8, 10, 'Circuito Centro', '5ª Ave → Plaza Circular', '11:30 AM', null, 'in_progress', '5ª Ave', 'Plaza Circular', 15],
  ];

  for (const t of trips) {
    insertTrip.run(...t);
  }

  const insertMaint = db.prepare(`
    INSERT INTO maintenance (vehicle_id, description, scheduled_date, priority, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  const maintenance = [
    [2, 'Reparación de Motor', '2026-10-24 08:00', 'high', 'pending'],
    [1, 'Inspección de Frenos', '2026-10-27 10:00', 'medium', 'pending'],
    [3, 'Rotación de Neumáticos', '2026-11-01 14:00', 'low', 'pending'],
  ];

  for (const m of maintenance) {
    insertMaint.run(...m);
  }

  // Fleet stats for last 7 days
  const insertStats = db.prepare(`
    INSERT INTO fleet_stats (date, active_trips, on_time_rate, active_drivers, utilization)
    VALUES (?, ?, ?, ?, ?)
  `);

  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    insertStats.run(dateStr, Math.floor(100 + Math.random() * 30), 88 + Math.random() * 10, 80 + Math.floor(Math.random() * 15), 80 + Math.random() * 15);
  }

  console.log('✓ Database seeded with sample data');
}

console.log('✓ Database ready at', DB_PATH);

module.exports = db;
