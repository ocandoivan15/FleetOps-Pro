import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getSettings } from '../api'

const links = [
  { to: '/', icon: 'dashboard', label: 'Panel Principal' },
  { to: '/trips', icon: 'route', label: 'Gestión de Viajes' },
  { to: '/fleet', icon: 'directions_bus', label: 'Gestión de Flota' },
  { to: '/drivers', icon: 'badge', label: 'Gestión de Conductores' },
  { to: '/clients', icon: 'contacts', label: 'Agenda de Clientes' },
]

const bottomLinks = [
  { to: '/settings', icon: 'settings', label: 'Configuración' },
  { to: '#', icon: 'contact_support', label: 'Soporte' },
]

export default function Sidebar() {
  const [logo, setLogo] = useState(null)

  useEffect(() => {
    getSettings()
      .then(s => {
        if (s.logo_filename) setLogo(`/${s.logo_filename}`)
      })
      .catch(() => {})
  }, [])

  return (
    <aside className="h-screen w-[240px] fixed left-0 top-0 z-40 hidden md:flex flex-col bg-surface-container-lowest border-r border-outline-variant py-stack-lg px-gutter">
      <div className="mb-stack-lg px-2">
        <img src={logo || '/logo-des.png'} alt="FleetOps Pro" className="w-full max-w-[320px] h-auto mx-auto" />
      </div>
      <nav className="flex-grow space-y-1">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-secondary font-bold border-r-4 border-secondary bg-secondary-container/10'
                  : 'text-on-surface-variant font-medium hover:bg-surface-container-low'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px] sidebar-nav-icon">{l.icon}</span>
            <span className="text-body-md">{l.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-1 pt-6 border-t border-outline-variant">
        {bottomLinks.map(l => (
          l.to.startsWith('/') ? (
            <NavLink key={l.label} to={l.to} end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-secondary font-bold border-r-4 border-secondary bg-secondary-container/10'
                    : 'text-on-surface-variant font-medium hover:bg-surface-container-low'
                }`
              }>
              <span className="material-symbols-outlined text-[20px] sidebar-nav-icon">{l.icon}</span>
              <span className="text-body-md">{l.label}</span>
            </NavLink>
          ) : (
            <a key={l.label} href={l.to} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors duration-200">
              <span className="material-symbols-outlined text-[20px]">{l.icon}</span>
              <span className="text-body-md">{l.label}</span>
            </a>
          )
        ))}
      </div>
    </aside>
  )
}
