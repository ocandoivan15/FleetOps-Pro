import { useState, useEffect } from 'react'
import { getClients, getClient, createClient, updateClient, deleteClient } from '../api'
import Modal from '../components/Modal'
import DropdownMenu from '../components/DropdownMenu'

export default function ClientAgenda() {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientTrips, setClientTrips] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', company: '', notes: '' })
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadClients = async () => {
    try {
      const data = await getClients()
      setClients(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadClients() }, [])

  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  const openDetail = async (client) => {
    try {
      const data = await getClient(client.id)
      setSelectedClient(data)
      setClientTrips(data.trips || [])
      setShowDetail(true)
    } catch (e) { console.error(e) }
  }

  const openNew = () => {
    setEditingId(null)
    setForm({ name: '', email: '', phone: '', address: '', company: '', notes: '' })
    setShowModal(true)
  }

  const openEdit = (c) => {
    setEditingId(c.id)
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '', company: c.company || '', notes: c.notes || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    setError('')
    if (!form.name) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      if (editingId) {
        await updateClient(editingId, form)
      } else {
        await createClient(form)
      }
      setShowModal(false)
      setError('')
      loadClients()
    } catch (e) {
      console.error(e)
      setError(e.message || 'Error al guardar cliente')
    }
    finally { setSaving(false) }
  }

  const handleDelete = async (client) => {
    if (!window.confirm(`¿Eliminar a ${client.name}? Los viajes asociados quedarán sin cliente asignado.`)) return;
    try {
      await deleteClient(client.id)
      setShowDetail(false)
      setSelectedClient(null)
      loadClients()
    } catch (e) {
      console.error(e)
      alert('Error al eliminar cliente')
    }
  }

  return (
    <>
      <div className="pb-stack-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-stack-lg gap-gutter">
          <div>
            <h3 className="font-headline-lg text-headline-lg text-primary">Agenda de Clientes</h3>
            <p className="text-on-surface-variant">Directorio de clientes, historial de viajes y ubicaciones.</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-stack-sm bg-secondary text-on-secondary px-gutter py-stack-sm rounded-lg font-medium shadow-sm hover:opacity-90 transition-all active:scale-95">
            <span className="material-symbols-outlined">person_add</span>
            Nuevo Cliente
          </button>
        </div>

        <div className="mb-stack-lg">
          <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-2 max-w-md">
            <span className="material-symbols-outlined text-outline">search</span>
            <input
              className="bg-transparent border-none focus:ring-0 text-body-md ml-3 w-full outline-none"
              placeholder="Buscar por nombre, empresa o teléfono..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-on-surface-variant">Cargando clientes...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {filtered.map(c => (
              <div
                key={c.id}
                onClick={() => openDetail(c)}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-all cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary font-bold text-body-lg">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-body-md text-primary">{c.name}</h4>
                      {c.company && <p className="text-label-md text-on-surface-variant">{c.company}</p>}
                    </div>
                  </div>
                  <DropdownMenu trigger={<span className="material-symbols-outlined text-[18px] text-on-surface-variant">more_vert</span>} items={[
                    { label: 'Editar', icon: 'edit', onClick: () => openEdit(c) },
                    { label: 'Eliminar', icon: 'delete', danger: true, onClick: () => handleDelete(c) },
                  ]} />
                </div>
                <div className="space-y-1.5 text-body-sm text-on-surface-variant">
                  {c.email && <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">mail</span>{c.email}</div>}
                  {c.phone && <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">call</span>{c.phone}</div>}
                  {c.address && <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">location_on</span>{c.address}</div>}
                </div>
                <div className="mt-3 pt-3 border-t border-outline-variant/50 flex justify-between text-label-md text-on-surface-variant">
                  <span>{c.total_trips || 0} viajes</span>
                  {c.last_trip_date && <span>Último: {new Date(c.last_trip_date).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] text-outline">contacts</span>
                <p className="mt-2">No se encontraron clientes</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Nuevo/Editar Cliente */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Editar Cliente' : 'Nuevo Cliente'} wide>
        <div className="space-y-stack-md">
          <div className="grid grid-cols-2 gap-stack-md">
            <div className="col-span-2">
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Nombre *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" placeholder="Nombre del cliente o empresa" />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Email</label>
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" type="email" />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Teléfono</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Dirección</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Empresa</label>
              <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" />
            </div>
            <div>
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider block mb-1">Notas</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:ring-2 focus:ring-secondary/20 outline-none" />
            </div>
          </div>
          {error && <div className="bg-error-container text-error px-4 py-2.5 rounded-lg text-body-sm font-medium">{error}</div>}
          <div className="flex justify-end gap-stack-sm pt-stack-md border-t border-outline-variant">
            <button onClick={() => setShowModal(false)} className="px-gutter py-stack-sm border border-outline-variant rounded-lg text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-gutter py-stack-sm bg-secondary text-on-secondary rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Cliente'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Detalle del Cliente */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={selectedClient?.name || 'Detalle del Cliente'} wide>
        {selectedClient && (
          <div className="space-y-stack-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary font-bold text-headline-md">
                    {selectedClient.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-headline-md text-primary">{selectedClient.name}</h4>
                    {selectedClient.company && <p className="text-body-sm text-on-surface-variant">{selectedClient.company}</p>}
                  </div>
                </div>
                <div className="space-y-2 text-body-sm">
                  {selectedClient.email && <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-secondary">mail</span>{selectedClient.email}</div>}
                  {selectedClient.phone && <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-secondary">call</span>{selectedClient.phone}</div>}
                  {selectedClient.address && <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-secondary">location_on</span>{selectedClient.address}</div>}
                </div>
                <div className="flex gap-4 pt-2">
                  <div className="bg-surface-container-low rounded-lg px-4 py-2 text-center">
                    <p className="font-headline-md font-bold text-primary">{selectedClient.total_trips || 0}</p>
                    <p className="text-label-md text-on-surface-variant">Viajes</p>
                  </div>
                  <div className="bg-surface-container-low rounded-lg px-4 py-2 text-center">
                    <p className="font-headline-md font-bold text-primary">{clientTrips.filter(t => t.status === 'completed').length}</p>
                    <p className="text-label-md text-on-surface-variant">Completados</p>
                  </div>
                </div>
              </div>
              <div className="bg-surface-container-low rounded-xl h-48 flex items-center justify-center">
                <div className="text-center">
                  <span className="material-symbols-outlined text-[48px] text-secondary">map</span>
                  <p className="font-bold text-body-sm">Ubicaciones de Viajes</p>
                  <p className="text-body-sm text-on-surface-variant">Mapa con últimas ubicaciones del cliente</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-stack-md border-t border-outline-variant gap-gutter">
              <button
                onClick={() => handleDelete(selectedClient)}
                className="flex items-center gap-2 px-gutter py-stack-sm border border-error/30 text-error rounded-lg font-medium hover:bg-error-container/20 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Eliminar Cliente
              </button>
            </div>

            <div className="border-t border-outline-variant pt-stack-md">
              <h5 className="font-bold text-body-lg text-primary mb-stack-md">Historial de Viajes</h5>
              {clientTrips.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant text-center py-4">Sin viajes registrados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container-low/50 text-label-md text-on-surface-variant uppercase">
                      <tr>
                        <th className="p-3 font-semibold">ID</th>
                        <th className="p-3 font-semibold">Ruta</th>
                        <th className="p-3 font-semibold">Conductor</th>
                        <th className="p-3 font-semibold">Estado</th>
                        <th className="p-3 font-semibold">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {clientTrips.map(t => (
                        <tr key={t.id} className="hover:bg-surface-container-low/20">
                          <td className="p-3 font-bold text-body-sm text-primary">{t.trip_id}</td>
                          <td className="p-3 text-body-sm">{t.route_name}</td>
                          <td className="p-3 text-body-sm">{t.driver_name || '—'}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-label-md font-bold ${t.statusInfo?.class || 'bg-surface-container text-on-surface-variant'}`}>
                              {t.statusInfo?.label || t.status}
                            </span>
                          </td>
                          <td className="p-3 text-body-sm text-on-surface-variant">{t.scheduled_time || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
