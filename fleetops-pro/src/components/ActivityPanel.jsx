import { timeAgo } from '../timeAgo'

const ICONS = {
  trip: { icon: 'route', bg: 'bg-blue-100 text-blue-700' },
  vehicle: { icon: 'directions_bus', bg: 'bg-teal-100 text-teal-700' },
  driver: { icon: 'badge', bg: 'bg-green-100 text-green-700' },
  client: { icon: 'contacts', bg: 'bg-purple-100 text-purple-700' },
}

function getIconConfig(action) {
  if (action.startsWith('trip.')) return ICONS.trip
  if (action.startsWith('vehicle.')) return ICONS.vehicle
  if (action.startsWith('driver.')) return ICONS.driver
  if (action.startsWith('client.')) return ICONS.client
  return { icon: 'history', bg: 'bg-surface-container text-on-surface-variant' }
}

export default function ActivityPanel({ activities, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-[999]" onClick={onClose} />
      <div className="fixed top-[68px] right-[140px] w-[420px] max-h-[500px] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-[1000] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-gutter py-stack-md border-b border-outline-variant shrink-0">
          <h3 className="font-headline-md text-headline-md font-bold text-primary">Actividad Reciente</h3>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] mb-3">history</span>
              <p className="text-body-sm">No hay actividad registrada</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[23px] top-4 bottom-4 w-[2px] bg-surface-container" />

              {activities.map((a) => {
                const cfg = getIconConfig(a.action)
                return (
                  <div key={a.id} className="flex items-start gap-4 px-gutter py-3">
                    {/* Dot/Icon */}
                    <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <span className="material-symbols-outlined text-[20px]">{cfg.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-body-sm text-on-surface">{a.description}</p>
                        <span className="text-label-md text-on-surface-variant whitespace-nowrap shrink-0 mt-0.5">
                          {timeAgo(a.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
