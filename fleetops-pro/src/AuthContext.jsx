import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('fleetops_token')
    if (!token) {
      setLoading(false)
      return
    }
    getMe()
      .then(data => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('fleetops_token')
      })
      .finally(() => setLoading(false))
  }, [])

  function logout() {
    localStorage.removeItem('fleetops_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
