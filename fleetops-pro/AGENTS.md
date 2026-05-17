# FleetOps Pro

Sistema de gestión de flotas de transporte público. SPA con backend Express + SQLite.

## Stack
- **Frontend**: React 19 + Vite 8 + Tailwind CSS v4 + react-router-dom
- **Backend**: Node.js + Express 5 + better-sqlite3
- **Iconos**: Material Symbols

## Estructura
```
├── server/
│   ├── index.cjs          # Express server (puerto 3001)
│   ├── database.cjs       # SQLite schema + seed data
│   └── routes/
│       ├── trips.cjs      # CRUD viajes
│       ├── fleet.cjs      # CRUD flota
│       └── drivers.cjs    # CRUD conductores
├── src/
│   ├── main.jsx           # Entry point
│   ├── App.jsx            # Routing SPA
│   ├── index.css          # Tailwind v4 + design tokens
│   ├── api.js             # Capa de datos (fetch al backend)
│   ├── components/
│   │   ├── Layout.jsx     # Sidebar + Topbar
│   │   ├── Sidebar.jsx    # Navegación
│   │   └── Topbar.jsx     # Barra superior
│   └── pages/
│       ├── Dashboard.jsx  # Vista principal con stats reales
│       ├── TripManagement.jsx
│       ├── FleetManagement.jsx
│       └── DriverManagement.jsx
├── data/
│   └── fleetops.db        # SQLite database (auto-generada)
└── AGENTS.md
```

## API REST
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/trips | Viajes (paginated, filterable) |
| GET | /api/trips/stats | Estadísticas agregadas |
| POST | /api/trips | Crear viaje |
| PATCH | /api/trips/:id | Actualizar viaje |
| GET | /api/fleet | Vehículos |
| GET | /api/fleet/stats | Distribución de flota |
| GET | /api/fleet/maintenance | Mantenimientos |
| POST | /api/fleet | Agregar vehículo |
| PATCH | /api/fleet/:id | Actualizar vehículo |
| GET | /api/drivers | Conductores |
| GET | /api/drivers/stats | Estadísticas |
| GET | /api/drivers/available | Disponibles para asignar |
| POST | /api/drivers | Agregar conductor |
| PATCH | /api/drivers/:id | Actualizar conductor |

## Base de Datos
- SQLite con WAL mode
- Tablas: vehicles, drivers, trips, maintenance, fleet_stats
- Seed automático al iniciar si la DB está vacía

## Comandos
| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Frontend Vite dev (puerto 5173) |
| `npm run dev:api` | Backend API (puerto 3001) |
| `npm run dev:all` | Ambos simultáneamente |
| `npm run build` | Build producción |

## Desarrollo
- Vite proxy `/api` → `localhost:3001`
- Frontend: http://localhost:5173
- API: http://localhost:3001/api

## Diseño
- Sidebar 240px fijo, ruta activa con borde azul
- Design tokens Material 3 en CSS
- Tipografía: Inter (body) + Hanken Grotesk (headings)
- Todo el UI en español
