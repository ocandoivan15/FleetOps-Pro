import { timeAgo } from '../timeAgo'

const ICONS = {
  maintenance_due: 'build',
  trip_delayed: 'warning',
  driver_critical: 'error',
  trip_created: 'route',
  vehicle_out_of_service: 'directions_bus',
}

export default function NotificationsPanel({ notifications, unreadCount, onMarkRead, onMarkAllRead, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-[999]" onClick={onClose} />
      <div
        className="fixed top-[68px] right-4 w-[380px] max-h-[520px] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-[1000] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-gutter py-stack-md border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-headline-md text-headline-md font-bold text-primary">Notificaciones</h3>
            {unreadCount > 0 && (
              <span className="min-w-[20px] h-[20px] flex items-center justify-center bg-primary text-on-primary text-[11px] font-bold rounded-full px-1.5">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-label-md text-primary hover:text-primary/80 transition-colors"
            >
              Marcar todas leídas
            </button>
          )}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-[48px] mb-3">notifications_off</span>
              <p className="text-body-sm">No hay notificaciones</p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                className={`w-full text-left flex items-start gap-3 px-gutter py-3 transition-colors hover:bg-surface-container-low ${
                  !n.read ? 'border-l-2 border-primary bg-primary-container/10' : ''
                }`}
                onClick={() => {
                  if (!n.read) onMarkRead(n.id)
                  onClose()
                }}
              >

                {/* Icon */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  n.type === 'driver_critical'
                    ? 'bg-error-container/30 text-error'
                    : n.type === 'trip_delayed'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-secondary-container/30 text-secondary'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {ICONS[n.type] || 'notifications'}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-body-sm ${!n.read ? 'font-bold text-on-surface' : 'text-on-surface'}`}>
                      {n.title}
                    </p>
                    <span className="text-label-md text-on-surface-variant whitespace-nowrap shrink-0 mt-0.5">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  <p className="text-label-md text-on-surface-variant mt-0.5 line-clamp-2">
                    {n.message}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  )
}
