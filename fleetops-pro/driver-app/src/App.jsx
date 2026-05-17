import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import TripDetail from './pages/TripDetail'

export default function App() {
  const [driver, setDriver] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('fleetops_driver')
    if (saved) {
      try {
        setDriver(JSON.parse(saved))
      } catch {}
    }
    setLoading(false)
  }, [])

  const handleLogin = (driverData, token) => {
    localStorage.setItem('fleetops_driver_token', token)
    localStorage.setItem('fleetops_driver', JSON.stringify(driverData))
    setDriver(driverData)
  }

  const handleLogout = () => {
    localStorage.removeItem('fleetops_driver_token')
    localStorage.removeItem('fleetops_driver')
    setDriver(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!driver) return <Login onLogin={handleLogin} />

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top bar */}
      <header className="bg-primary text-on-primary px-4 py-4 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="font-bold text-lg">FleetOps Chofer</h1>
          <p className="text-sm opacity-80">{driver.name}</p>
        </div>
        <button onClick={handleLogout} className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined text-[22px]">logout</span>
        </button>
      </header>

      {/* Content */}
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Dashboard driver={driver} />} />
          <Route path="/trips/:id" element={<TripDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}
