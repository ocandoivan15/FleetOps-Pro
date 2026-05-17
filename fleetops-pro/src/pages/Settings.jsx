import { useState, useEffect } from 'react'
import { getSettings, updateSettings, uploadLogo, exportData, resetData, getUsers, createUser, updateUser, deleteUser } from '../api'
import { useAuth } from '../AuthContext'

const TABS = [
  { id: 'company', label: 'Empresa', icon: 'business' },
  { id: 'defaults', label: 'Valores por Defecto', icon: 'tune' },
  { id: 'workshop', label: 'Taller', icon: 'build' },
  { id: 'users', label: 'Usuarios', icon: 'group' },
  { id: 'database', label: 'Base de Datos', icon: 'storage' },
  { id: 'appearance', label: 'Apariencia', icon: 'palette' },
]

const ROLE_LABELS = { admin: 'Administrador', operator: 'Operador', viewer: 'Consultor' }
const ROLE_COLORS = { admin: 'bg-secondary-fixed text-on-secondary-fixed', operator: 'bg-tertiary-fixed text-on-tertiary-fixed', viewer: 'bg-surface-container-high text-on-surface-variant' }

export default function Settings() {
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('company')
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  // ── Company state ──
  const [companyForm, setCompanyForm] = useState({ company_name: '', company_address: '', company_phone: '', company_email: '' })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  // ── Defaults state ──
  const [defaultsForm, setDefaultsForm] = useState({
    default_trip_type: 'one_way', default_passenger_count: '40',
    bus_default_capacity: '50', electric_default_capacity: '80', van_default_capacity: '15',
    map_lat: '10.6549', map_lng: '-71.6521',
  })

  // ── Workshop state ──
  const [checklistItems, setChecklistItems] = useState([])
  const [newItem, setNewItem] = useState('')

  // ── Users state ──
  const [users, setUsers] = useState([])
  const [userModal, setUserModal] = useState(null) // null | 'create' | user object
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'operator', active: true })

  // ── Export / Reset state ──
  const [exporting, setExporting] = useState(false)
  const [resetting, setResetting] = useState(false)

  // ── Theme state ──
  const [theme, setTheme] = useState('light')

  // Load settings
  useEffect(() => {
    async function load() {
      try {
        const data = await getSettings()
        setSettings(data)
        setCompanyForm({
          company_name: data.company_name || '', company_address: data.company_address || '',
          company_phone: data.company_phone || '', company_email: data.company_email || '',
        })
        setDefaultsForm({
          default_trip_type: data.default_trip_type || 'one_way', default_passenger_count: data.default_passenger_count || '40',
          bus_default_capacity: data.bus_default_capacity || '50', electric_default_capacity: data.electric_default_capacity || '80',
          van_default_capacity: data.van_default_capacity || '15', map_lat: data.map_lat || '10.6549', map_lng: data.map_lng || '-71.6521',
        })
        setTheme(data.theme || 'light')
        try { const items = JSON.parse(data.checklist_items || '[]'); setChecklistItems(items) } catch { setChecklistItems([]) }
      } catch (e) {
        console.error('Error loading settings:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Load users when tab changes to users
  useEffect(() => {
    if (activeTab === 'users') {
      getUsers().then(setUsers).catch(() => {})
    }
  }, [activeTab])

  // Dark mode toggle
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  function showMsg(text, type = 'success') {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  // ── Company ──
  async function saveCompany() {
    setSaving(true)
    try {
      if (logoFile) await uploadLogo(logoPreview)
      await updateSettings(companyForm)
      showMsg('Datos de empresa guardados')
    } catch { showMsg('Error al guardar', 'error') } finally { setSaving(false) }
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  // ── Defaults ──
  async function saveDefaults() {
    setSaving(true)
    try { await updateSettings(defaultsForm); showMsg('Valores por defecto guardados') }
    catch { showMsg('Error al guardar', 'error') } finally { setSaving(false) }
  }

  // ── Workshop ──
  async function saveChecklist() {
    setSaving(true)
    try { await updateSettings({ checklist_items: JSON.stringify(checklistItems) }); showMsg('Lista de taller guardada') }
    catch { showMsg('Error al guardar', 'error') } finally { setSaving(false) }
  }

  function addChecklistItem() {
    const item = newItem.trim()
    if (!item || checklistItems.includes(item)) return
    setChecklistItems([...checklistItems, item])
    setNewItem('')
  }

  function removeChecklistItem(idx) {
    setChecklistItems(checklistItems.filter((_, i) => i !== idx))
  }

  // ── Users ──
  function openCreateUser() {
    setUserForm({ name: '', email: '', password: '', role: 'operator', active: true })
    setUserModal('create')
  }

  function openEditUser(u) {
    setUserForm({ name: u.name, email: u.email, password: '', role: u.role, active: !!u.active })
    setUserModal(u)
  }

  async function saveUser() {
    const editing = userModal && userModal !== 'create'
    setSaving(true)
    try {
      if (editing) {
        const payload = { name: userForm.name, email: userForm.email, role: userForm.role, active: userForm.active }
        if (userForm.password) payload.password = userForm.password
        await updateUser(userModal.id, payload)
        showMsg('Usuario actualizado')
      } else {
        await createUser(userForm)
        showMsg('Usuario creado')
      }
      setUserModal(null)
      setUsers(await getUsers())
    } catch (e) {
      showMsg('Error al guardar usuario', 'error')
    } finally { setSaving(false) }
  }

  async function handleDeleteUser(u) {
    if (!confirm(`¿Eliminar a ${u.name}? Esta acción no se puede deshacer.`)) return
    try {
      await deleteUser(u.id)
      showMsg('Usuario eliminado')
      setUsers(await getUsers())
    } catch (e) {
      showMsg('Error al eliminar', 'error')
    }
  }

  // ── Export / Reset ──
  async function handleExport() {
    setExporting(true)
    try {
      const data = await exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `fleetops-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click(); URL.revokeObjectURL(url)
      showMsg('Datos exportados correctamente')
    } catch { showMsg('Error al exportar', 'error') } finally { setExporting(false) }
  }

  async function handleReset() {
    if (!confirm('¿Estás seguro? Se borrarán todos los datos de prueba. Esta acción no se puede deshacer.')) return
    if (!confirm('¿Realmente estás seguro? Los viajes, conductores, vehículos y clientes se eliminarán.')) return
    setResetting(true)
    try { await resetData(); showMsg('Datos eliminados. Reiniciá el servidor para regenerarlos.') }
    catch { showMsg('Error al resetear', 'error') } finally { setResetting(false) }
  }

  async function setThemeAndSave(newTheme) {
    setTheme(newTheme)
    try { await updateSettings({ theme: newTheme }) } catch {}
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><span className="material-symbols-outlined animate-spin text-secondary text-4xl">sync</span></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-lg font-headline-lg text-on-surface">Configuración</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Personalizá el sistema a tu medida</p>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-body-sm font-medium ${msg.type === 'error' ? 'bg-error-container text-on-error-container' : 'bg-secondary-fixed text-on-secondary-fixed'}`}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-outline-variant pb-0 overflow-x-auto hide-scrollbar">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-body-sm font-medium whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab.id ? 'border-secondary text-secondary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}>
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Empresa ── */}
      {activeTab === 'company' && (
        <div className="space-y-5 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Nombre de la Empresa</label>
              <input value={companyForm.company_name} onChange={e => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Dirección</label>
              <input value={companyForm.company_address} onChange={e => setCompanyForm({ ...companyForm, company_address: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary" />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Teléfono</label>
              <input value={companyForm.company_phone} onChange={e => setCompanyForm({ ...companyForm, company_phone: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary" />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Email</label>
              <input value={companyForm.company_email} onChange={e => setCompanyForm({ ...companyForm, company_email: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary" />
            </div>
          </div>
          <div>
            <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-outline-variant flex items-center justify-center overflow-hidden bg-surface-container-low">
                {logoPreview ? <img src={logoPreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                  : <span className="material-symbols-outlined text-outline text-3xl">add_photo_alternate</span>}
              </div>
              <label className="cursor-pointer px-4 py-2 rounded-lg bg-secondary text-on-secondary text-body-sm font-medium hover:opacity-90 transition">
                Seleccionar archivo
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
            </div>
          </div>
          <button onClick={saveCompany} disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-secondary text-on-secondary text-body-sm font-medium hover:opacity-90 transition disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      )}

      {/* ── Valores por Defecto ── */}
      {activeTab === 'defaults' && (
        <div className="space-y-5 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Tipo de Viaje</label>
              <select value={defaultsForm.default_trip_type} onChange={e => setDefaultsForm({ ...defaultsForm, default_trip_type: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary">
                <option value="one_way">Ida</option>
                <option value="round_trip">Ida y Vuelta</option>
                <option value="multi">Varios Viajes</option>
              </select>
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Pasajeros por Defecto</label>
              <input type="number" min="0" value={defaultsForm.default_passenger_count} onChange={e => setDefaultsForm({ ...defaultsForm, default_passenger_count: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary" />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Capacidad Autobús</label>
              <input type="number" min="0" value={defaultsForm.bus_default_capacity} onChange={e => setDefaultsForm({ ...defaultsForm, bus_default_capacity: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary" />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Capacidad Eléctrico</label>
              <input type="number" min="0" value={defaultsForm.electric_default_capacity} onChange={e => setDefaultsForm({ ...defaultsForm, electric_default_capacity: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary" />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Capacidad Van</label>
              <input type="number" min="0" value={defaultsForm.van_default_capacity} onChange={e => setDefaultsForm({ ...defaultsForm, van_default_capacity: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary" />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Latitud del Mapa</label>
              <input type="number" step="any" value={defaultsForm.map_lat} onChange={e => setDefaultsForm({ ...defaultsForm, map_lat: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary" />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Longitud del Mapa</label>
              <input type="number" step="any" value={defaultsForm.map_lng} onChange={e => setDefaultsForm({ ...defaultsForm, map_lng: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary" />
            </div>
          </div>
          <button onClick={saveDefaults} disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-secondary text-on-secondary text-body-sm font-medium hover:opacity-90 transition disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      )}

      {/* ── Taller ── */}
      {activeTab === 'workshop' && (
        <div className="space-y-5 max-w-2xl">
          <p className="text-body-md text-on-surface-variant">Personalizá los items del checklist que aparecen al enviar un vehículo al taller.</p>
          <div className="space-y-2">
            {checklistItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-surface-container-low border border-outline-variant">
                <span className="text-body-md text-on-surface">{item}</span>
                <button onClick={() => removeChecklistItem(idx)} className="text-on-surface-variant hover:text-error transition p-1">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
              placeholder="Nuevo item del checklist..."
              className="flex-1 px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary" />
            <button onClick={addChecklistItem} disabled={!newItem.trim()}
              className="px-4 py-2.5 rounded-lg bg-secondary-container text-white text-body-sm font-medium hover:opacity-90 transition disabled:opacity-50">Agregar</button>
          </div>
          <button onClick={saveChecklist} disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-secondary text-on-secondary text-body-sm font-medium hover:opacity-90 transition disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar Checklist'}
          </button>
        </div>
      )}

      {/* ── Usuarios ── */}
      {activeTab === 'users' && (
        <div className="space-y-5 max-w-3xl">
          <div className="flex items-center justify-between">
            <p className="text-body-md text-on-surface-variant">Gestioná los usuarios del sistema y sus roles de acceso.</p>
            <button onClick={openCreateUser}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-on-secondary text-body-sm font-medium hover:opacity-90 transition">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Nuevo Usuario
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-outline-variant">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="bg-surface-container-high">
                  <th className="text-left px-4 py-3 font-semibold text-on-surface">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-on-surface">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-on-surface">Rol</th>
                  <th className="text-left px-4 py-3 font-semibold text-on-surface">Estado</th>
                  <th className="text-right px-4 py-3 font-semibold text-on-surface">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {users.map(u => (
                  <tr key={u.id} className="bg-surface hover:bg-surface-container-low transition">
                    <td className="px-4 py-3 font-medium text-on-surface">
                      {u.name}
                      {u.id === currentUser?.id && <span className="ml-2 text-label-md text-on-surface-variant">(tú)</span>}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-label-md font-medium ${ROLE_COLORS[u.role] || ''}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 ${u.active ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                        <span className={`w-2 h-2 rounded-full ${u.active ? 'bg-secondary' : 'bg-outline'}`} />
                        {u.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditUser(u)}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        {u.id !== currentUser?.id && (
                          <button onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* User modal */}
          {userModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setUserModal(null)}>
              <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md border border-outline-variant shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-headline-md font-headline-md text-on-surface mb-4">
                  {userModal === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Nombre</label>
                    <input value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary" />
                  </div>
                  <div>
                    <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Email</label>
                    <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary" />
                  </div>
                  <div>
                    <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">
                      {userModal === 'create' ? 'Contraseña' : 'Nueva contraseña (dejar vacío para mantener)'}
                    </label>
                    <input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder={userModal === 'create' ? '••••••••' : 'Dejar vacío = sin cambios'}
                      className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary" />
                  </div>
                  <div>
                    <label className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1 block">Rol</label>
                    <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-secondary">
                      <option value="admin">Administrador</option>
                      <option value="operator">Operador</option>
                      <option value="viewer">Consultor</option>
                    </select>
                  </div>
                  {userModal !== 'create' && (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="user-active" checked={userForm.active}
                        onChange={e => setUserForm({ ...userForm, active: e.target.checked })}
                        className="w-4 h-4 rounded border-outline-variant text-secondary focus:ring-secondary" />
                      <label htmlFor="user-active" className="text-body-md text-on-surface">Usuario activo</label>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setUserModal(null)}
                    className="px-4 py-2.5 rounded-lg border border-outline-variant text-on-surface text-body-sm font-medium hover:bg-surface-container-low transition">
                    Cancelar
                  </button>
                  <button onClick={saveUser} disabled={saving}
                    className="px-4 py-2.5 rounded-lg bg-secondary text-on-secondary text-body-sm font-medium hover:opacity-90 transition disabled:opacity-50">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Base de Datos ── */}
      {activeTab === 'database' && (
        <div className="space-y-5 max-w-2xl">
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
            <h3 className="text-headline-md font-headline-md text-on-surface mb-2">Exportar Datos</h3>
            <p className="text-body-md text-on-surface-variant mb-3">Descargá toda la base de datos en formato JSON.</p>
            <button onClick={handleExport} disabled={exporting}
              className="px-6 py-2.5 rounded-lg bg-secondary text-on-secondary text-body-sm font-medium hover:opacity-90 transition disabled:opacity-50">
              {exporting ? 'Exportando...' : 'Exportar JSON'}
            </button>
          </div>
          <div className="p-4 rounded-xl bg-error-container/30 border border-outline-variant">
            <h3 className="text-headline-md font-headline-md text-error mb-2">Resetear Datos de Prueba</h3>
            <p className="text-body-md text-on-surface-variant mb-3">Elimina todos los datos. Reiniciá el servidor para regenerarlos.</p>
            <button onClick={handleReset} disabled={resetting}
              className="px-6 py-2.5 rounded-lg bg-error text-on-error text-body-sm font-medium hover:opacity-90 transition disabled:opacity-50">
              {resetting ? 'Reseteando...' : 'Resetear Datos'}
            </button>
          </div>
        </div>
      )}

      {/* ── Apariencia ── */}
      {activeTab === 'appearance' && (
        <div className="space-y-5 max-w-2xl">
          <p className="text-body-md text-on-surface-variant">Elegí el tema visual del sistema.</p>
          <div className="flex gap-4">
            <button onClick={() => setThemeAndSave('light')}
              className={`flex-1 p-6 rounded-xl border-2 transition text-center ${theme === 'light' ? 'border-secondary bg-secondary-fixed/30' : 'border-outline-variant bg-surface-container-low hover:border-outline'}`}>
              <span className="material-symbols-outlined text-3xl text-amber-500">light_mode</span>
              <p className="text-body-md font-medium text-on-surface mt-2">Claro</p>
            </button>
            <button onClick={() => setThemeAndSave('dark')}
              className={`flex-1 p-6 rounded-xl border-2 transition text-center ${theme === 'dark' ? 'border-secondary bg-secondary-fixed/30' : 'border-outline-variant bg-surface-container-low hover:border-outline'}`}>
              <span className="material-symbols-outlined text-3xl text-indigo-400">dark_mode</span>
              <p className="text-body-md font-medium text-on-surface mt-2">Oscuro</p>
            </button>
          </div>
          <p className="text-body-sm text-on-surface-variant italic">El cambio es inmediato y se guarda automáticamente.</p>
        </div>
      )}
    </div>
  )
}
