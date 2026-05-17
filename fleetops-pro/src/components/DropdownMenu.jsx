import { useState, useRef, useEffect, useCallback } from 'react'

export default function DropdownMenu({ trigger, items = [] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const ref = useRef(null)
  const menuRef = useRef(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) close()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, close])

  const handleTrigger = (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (!open) {
      const rect = e.currentTarget.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setOpen(prev => !prev)
  }

  // Close on scroll/resize
  useEffect(() => {
    if (!open) return
    const handle = () => close()
    window.addEventListener('scroll', handle, true)
    window.addEventListener('resize', handle)
    return () => {
      window.removeEventListener('scroll', handle, true)
      window.removeEventListener('resize', handle)
    }
  }, [open, close])

  return (
    <div className="inline-block" ref={ref}>
      <div onClick={handleTrigger} onContextMenu={(e) => e.preventDefault()} className="cursor-pointer inline-flex">
        {trigger}
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-[999]" onClick={close} />
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 1000 }}
            className="min-w-[180px] bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg py-1"
          >
            {items.map((item, i) => {
              if (item.divider) return <div key={i} className="h-px bg-outline-variant my-1" />
              return (
                <button
                  key={i}
                  className={`flex items-center gap-3 w-full px-4 py-2.5 text-body-sm transition-colors text-left ${
                    item.danger
                      ? 'text-error hover:bg-error-container/30'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    item.onClick?.()
                    close()
                  }}
                >
                  {item.icon && <span className="material-symbols-outlined text-[18px]">{item.icon}</span>}
                  {item.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
