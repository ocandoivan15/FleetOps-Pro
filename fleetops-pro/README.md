# 🚍 FleetOps Pro

Sistema de gestión de flotas de transporte público. SPA con React 19 + Express 5 + SQLite.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 8 + Tailwind CSS v4 + react-router-dom |
| Backend | Node.js + Express 5 |
| Base de Datos | SQLite (better-sqlite3) |
| Mapas | Leaflet + ESRI World Imagery + CartoDB |
| Iconos | Material Symbols |
| Fuentes | Inter + Hanken Grotesk |

---

## Inicio Rápido

### Requisitos

- Node.js 18+
- npm

### Instalación

```bash
cd fleetops-pro
npm install
```

### Desarrollo (dos terminales)

**Terminal 1 — API:**
```bash
node server/index.cjs
# → http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
npm run dev
# → http://localhost:5173
```

O con los scripts incluidos:
```bash
start-dev.bat        # Frontend + API en ventanas separadas
start-all.bat        # Frontend + API en una sola terminal (PowerShell)
```

### Producción

```bash
npm run build
node server/index.cjs  # Sirve build desde Express
# → http://localhost:3001
```

> El Vite dev server proxy `/api` → `localhost:3001`. En producción Express sirve `dist/` directamente.

---

## Primer Ingreso

| Campo | Valor |
|-------|-------|
| Email | `admin@fleetops.pro` |
| Contraseña | `admin123` |

Creá usuarios adicionales desde **Configuración → Usuarios**.

### Roles

| Rol | Acceso |
|-----|--------|
| **Administrador** | Gestión completa del sistema, incluyendo usuarios |
| **Operador** | Gestión de viajes, flota, conductores y clientes |
| **Consultor** | Visualización de datos sin edición |

---

## Guía de Funciones

### 🎛️ Panel Principal (`/`)

- **Tarjetas de resumen**: viajes hoy, uso de flota, conductores activos, alertas pendientes
- **Mapa de flota**: satelital (ESRI) con conmutador a calles (CartoDB), clustering de marcadores, panel lateral de vehículos, popups con datos completos
- **Próximas salidas**: lista de viajes programados
- **Distribución de flota**: proporción Autobús / Eléctrico / Van

### 🛣️ Gestión de Viajes (`/trips`)

**Tabs**:
- **Activos**: viajes `pending`, `in_progress`, `on_time`, `delayed` — paginados de a 4
- **Histórico**: viajes `completed` — últimos 50

**Acciones por viaje** (menú ⋮):
- Marcar en Curso
- Marcar Completado
- Asignar Conductor (modal con conductores disponibles)
- Cancelar

**Crear Viaje**:
1. Nombre de ruta
2. Seleccionar cliente (o crear uno nuevo inline)
3. Tipo de viaje: Ida / Ida y Vuelta / Varios Viajes
4. Cantidad de pasajeros + hora programada
5. **Mapa interactivo**: click para marcar origen, click para marcar destino (marcadores arrastrables)
6. Nombrar cada punto — la descripción se genera automáticamente

**Salud del Sistema**: card con métricas en vivo — rendimiento a tiempo, conductores activos, vehículos en taller, viajes demorados.

**Mapa de densidad**: rutas en vivo con la flota actual.

### 🚌 Gestión de Flota (`/fleet`)

- Tabla completa con datos de cada vehículo
- **Crear vehículo**: ID, placa, modelo, año, tipo (Autobús/Eléctrico/Van), km, capacidad
- **Editar vehículo**: modal con todos los campos
- **Eliminar**: elimina también mantenimientos y checklist asociados, nullifica viajes

**Modal de detalle** (click en fila):
- **Pestaña Taller**: histórico de mantenimientos con tipo tags (Reparación/Mantenimiento)
- **Pestaña Viajes**: historial de viajes del vehículo

**Enviar al Taller**:
1. Seleccionar tipo: Reparación / Mantenimiento
2. Ingresar km actuales
3. Checklist personalizable (10 items default)
4. Razón y explicación
5. Descripción auto-generada

### 👤 Gestión de Conductores (`/drivers`)

- Tabla paginada con nombre, email, licencia, teléfono, estado, horas totales
- **Editar**: modal con nombre, email, licencia, teléfono
- **Eliminar**: nullifica viajes asignados
- **Asignar viaje**: dropdown con viajes sin conductor

### 📇 Agenda de Clientes (`/clients`)

- **Dashboard de clientes**: cards con búsqueda por nombre/empresa
- **Ver detalle**: información completa + historial de viajes
- **Crear/Editar**: modal con nombre, email, teléfono, dirección, empresa, notas
- **Eliminar**: nullifica viajes asociados

### ⚙️ Configuración (`/settings`)

| Pestaña | Descripción |
|---------|------------|
| **Empresa** | Nombre, dirección, teléfono, email + subir logo |
| **Valores por Defecto** | Tipo de viaje, pasajeros, capacidad por tipo, centro del mapa |
| **Taller** | Items del checklist personalizables (agregar/sacar) |
| **Usuarios** | Alta/baja/edición de usuarios con roles |
| **Base de Datos** | Exportar JSON completo — Resetear datos de prueba |
| **Apariencia** | Tema claro/oscuro |

---

## API REST

Todas las rutas bajo `/api`.

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login — email + password → token + user |
| GET | `/api/auth/me` | Validar token (Header `Authorization: Bearer <token>`) |

### Viajes

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/trips` | Lista paginada — query: `page`, `limit`, `status`, `search` |
| GET | `/api/trips/stats` | Estadísticas: total, activos, on_time_rate, demorados, hoy |
| POST | `/api/trips` | Crear viaje |
| PATCH | `/api/trips/:id` | Actualizar (status, driver, etc.) |
| GET | `/api/trips/unassigned` | Viajes sin conductor asignado |
| PATCH | `/api/trips/:id/assign-driver` | Asignar conductor |

### Flota

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/fleet` | Lista vehículos con paginación |
| GET | `/api/fleet/stats` | Distribución: total, activos, mantenimiento, inactivos |
| GET | `/api/fleet/maintenance` | Próximos mantenimientos |
| GET | `/api/fleet/:id` | Detalle con viajes + mantenimientos + checklist |
| POST | `/api/fleet` | Crear vehículo |
| PATCH | `/api/fleet/:id` | Actualizar vehículo |
| DELETE | `/api/fleet/:id` | Eliminar (cascade) |
| POST | `/api/fleet/:id/send-to-taller` | Enviar al taller con checklist |

### Conductores

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/drivers` | Lista paginada |
| GET | `/api/drivers/stats` | Estadísticas: total, on_duty, rest, critical |
| GET | `/api/drivers/available` | Disponibles para asignar |
| POST | `/api/drivers` | Crear |
| PATCH | `/api/drivers/:id` | Actualizar |
| DELETE | `/api/drivers/:id` | Eliminar (nullifica viajes) |

### Clientes

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/clients` | Lista |
| GET | `/api/clients/:id` | Detalle con historial de viajes |
| POST | `/api/clients` | Crear |
| PATCH | `/api/clients/:id` | Actualizar |
| DELETE | `/api/clients/:id` | Eliminar (nullifica viajes) |

### Configuración

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/settings` | Obtener todas las settings como `{ key: value }` |
| PUT | `/api/settings` | Actualizar settings (bulk) |
| POST | `/api/settings/logo` | Subir logo (base64: `{ data: "data:image/..." }`) |
| GET | `/api/settings/export` | Exportar toda la DB como JSON |
| POST | `/api/settings/rest`  | Resetear datos de prueba |

### Usuarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/users` | Lista de usuarios |
| POST | `/api/users` | Crear usuario |
| PATCH | `/api/users/:id` | Actualizar (nombre, email, rol, active, password) |
| DELETE | `/api/users/:id` | Eliminar (protegido: no borra último admin) |

---

## Base de Datos

SQLite con WAL mode. El archivo está en `data/fleetops.db`.

### Tablas

- `vehicles` — Flota de vehículos
- `drivers` — Conductores
- `trips` — Viajes (con campos geo: origin_lat/lng, dest_lat/lng)
- `maintenance` — Mantenimientos y reparaciones
- `maintenance_checklist` — Items de checklist de taller
- `clients` — Clientes corporativos
- `fleet_stats` — Estadísticas diarias
- `settings` — Configuración del sistema (key-value)
- `users` — Usuarios del sistema

### Seed

La DB se genera automáticamente al arrancar el servidor si está vacía:
- 8 vehículos, 10 conductores, 6 viajes, 3 mantenimientos, 8 clientes
- 1 usuario admin (`admin@fleetops.pro` / `admin123`)
- Settings por defecto

> Eliminá `data/fleetops.db` y reiniciá el servidor para forzar un reseed completo.

---

## Estructura del Proyecto

```
fleetops-pro/
├── server/
│   ├── index.cjs           # Express server entry
│   ├── database.cjs        # Schema + seed
│   └── routes/
│       ├── auth.cjs        # Login + token validation
│       ├── trips.cjs       # CRUD viajes
│       ├── fleet.cjs       # CRUD flota + taller
│       ├── drivers.cjs     # CRUD conductores
│       ├── clients.cjs     # CRUD clientes
│       ├── settings.cjs    # Configuración + export
│       └── users.cjs       # CRUD usuarios
├── src/
│   ├── main.jsx            # Entry point (BrowserRouter)
│   ├── App.jsx             # Auth guard + routing
│   ├── AuthContext.jsx     # Sesión + login state
│   ├── api.js              # Capa de datos (fetch)
│   ├── index.css           # Tailwind v4 + Material 3 tokens + dark mode
│   ├── components/
│   │   ├── Layout.jsx      # Sidebar + Topbar wrapper
│   │   ├── Sidebar.jsx     # Navegación principal
│   │   ├── Topbar.jsx      # Barra superior con usuario
│   │   ├── FleetMap.jsx    # Mapa Leaflet con clustering
│   │   ├── DropdownMenu.jsx # Menú contextual fixed
│   │   └── Modal.jsx       # Modal reutilizable
│   └── pages/
│       ├── Dashboard.jsx
│       ├── TripManagement.jsx
│       ├── FleetManagement.jsx
│       ├── DriverManagement.jsx
│       ├── ClientAgenda.jsx
│       ├── Settings.jsx
│       └── Login.jsx
├── public/
│   ├── logo.png            # Logo principal
│   └── logo-des.png        # Logo sidebar
├── data/
│   └── fleetops.db         # SQLite (auto-generada, no versionada)
└── package.json
```

---

## Diseño

- **Sidebar** 240px fijo con ruta activa + filled icon
- **Design tokens** Material 3 vía Tailwind v4 custom theme
- **Tipografía**: Inter (body) + Hanken Grotesk (headings)
- **Tema**: Claro/Oscuro con persistencia en DB
- **Mapas**: ESRI World Imagery (satelital) + CartoDB (calles) toggle
- **Responsive**: sidebar oculta en mobile, topbar se adapta

---

## Notas Técnicas

- **Mapas**: No se usa Google Maps (sin API key disponible para Venezuela). En su lugar Leaflet + ESRI/CartoDB.
- **GPS**: El campo `km` en vehículos se ingresa manualmente. Diseñado para integrarse con app móvil Android que envíe km por GPS.
- **Passwords**: Hash SHA256 (simple para tool interno).
- **Logo**: Se sube desde Settings → Empresa. Se guarda como `public/logo-custom.*` y el nombre en settings. La sidebar lo muestra automáticamente.
