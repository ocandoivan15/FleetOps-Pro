import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TripManagement from './pages/TripManagement'
import FleetManagement from './pages/FleetManagement'
import DriverManagement from './pages/DriverManagement'
import ClientAgenda from './pages/ClientAgenda'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { getSettings } from './api'

function AppContent() {
  const { user, loading } = useAuth()

  // Load theme on startup
  useEffect(() => {
    getSettings()
      .then(s => {
        if (s.theme === 'dark') document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
      })
      .catch(() => {})
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-secondary text-4xl">sync</span>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <Routes>
      <Route path="/" element={<Layout title="Centro de Operaciones"><Dashboard /></Layout>} />
      <Route path="/trips" element={<Layout title="Gestión de Viajes"><TripManagement /></Layout>} />
      <Route path="/fleet" element={<Layout title="Gestión de Flota"><FleetManagement /></Layout>} />
      <Route path="/drivers" element={<Layout title="Gestión de Conductores"><DriverManagement /></Layout>} />
      <Route path="/clients" element={<Layout title="Agenda de Clientes"><ClientAgenda /></Layout>} />
      <Route path="/settings" element={<Layout title="Configuración"><Settings /></Layout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
