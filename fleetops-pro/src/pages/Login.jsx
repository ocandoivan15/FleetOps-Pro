import { useState } from 'react'
import { useAuth } from '../AuthContext'
import { login as apiLogin } from '../api'

export default function Login() {
  const { setUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await apiLogin(email, password)
      localStorage.setItem('fleetops_token', data.token)
      setUser(data.user)
    } catch (err) {
      setError('Email o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo-des.png" alt="FleetOps Pro" className="w-48 mx-auto mb-4" />
          <h1 className="text-headline-lg font-headline-lg text-on-surface">FleetOps Pro</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Iniciá sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-error-container text-on-error-container text-body-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@fleetops.pro" required
              className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary" />
          </div>

          <div>
            <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg bg-secondary text-on-secondary text-body-sm font-medium hover:opacity-90 transition disabled:opacity-50">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
