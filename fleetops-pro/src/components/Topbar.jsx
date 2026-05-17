import { useAuth } from '../AuthContext'

export default function Topbar({ title = 'Centro de Operaciones' }) {
  const { user, logout } = useAuth()

  return (
    <header className="fixed top-0 right-0 left-0 md:left-[240px] z-30 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant">
      <div className="flex justify-between items-center h-16 px-container-padding">
        <div className="flex items-center gap-stack-md">
          <button className="md:hidden p-2 hover:bg-surface-container-low rounded-full">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h2 className="font-headline-md text-headline-md font-bold text-primary">{title}</h2>
          <div className="hidden lg:flex items-center bg-surface-container-low rounded-full px-4 py-1.5 ml-8 border border-outline-variant">
            <span className="material-symbols-outlined text-outline text-[20px]">search</span>
            <input className="bg-transparent border-none focus:ring-0 text-body-sm w-64 ml-2" placeholder="Buscar flota, viajes o conductores..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative p-2 text-on-surface-variant hover:text-secondary transition-colors rounded-full">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
          </button>
          <button className="p-2 text-on-surface-variant hover:text-secondary transition-colors rounded-full">
            <span className="material-symbols-outlined">history</span>
          </button>
          <div className="h-8 w-[1px] bg-outline-variant mx-2" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="font-bold text-body-sm leading-tight">{user?.name || 'Usuario'}</p>
              <p className="text-label-md text-on-surface-variant">{user?.role === 'admin' ? 'Administrador' : user?.role === 'operator' ? 'Operador' : 'Consultor'}</p>
            </div>
            <div className="relative group">
              <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center overflow-hidden border-2 border-secondary-container cursor-pointer">
                <span className="material-symbols-outlined text-secondary text-[20px]">person</span>
              </div>
              <div className="absolute right-0 top-full mt-2 w-48 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-3 border-b border-outline-variant">
                  <p className="text-body-sm font-medium text-on-surface">{user?.name}</p>
                  <p className="text-label-md text-on-surface-variant">{user?.email}</p>
                </div>
                <button onClick={logout} className="w-full text-left px-3 py-2.5 text-body-sm text-on-surface-variant hover:bg-surface-container-low transition flex items-center gap-2 rounded-b-xl">
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
