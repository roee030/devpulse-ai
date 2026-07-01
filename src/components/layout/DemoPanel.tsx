// src/components/layout/DemoPanel.tsx
// Floating demo control panel — lets presenters switch personas on-the-fly.
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, Check, X } from 'lucide-react'
import { useUser } from '../../context/UserContext'
import type { User } from '../../data/mockData'

const ROLE_GROUPS = [
  { role: 'cto',          label: 'C-Level',       dot: 'bg-accent',      text: 'text-accent' },
  { role: 'divisionHead', label: 'Division Heads', dot: 'bg-violet-400',  text: 'text-violet-400' },
  { role: 'teamLead',     label: 'Team Leads',     dot: 'bg-warning',     text: 'text-warning' },
  { role: 'developer',    label: 'Developers',     dot: 'bg-success',     text: 'text-success' },
]

const ROLE_DOT: Record<string, string> = {
  cto: 'bg-accent', divisionHead: 'bg-violet-400', teamLead: 'bg-warning', developer: 'bg-success',
}

const ROLE_TEXT: Record<string, string> = {
  cto: 'text-accent', divisionHead: 'text-violet-400', teamLead: 'text-warning', developer: 'text-success',
}

export function DemoPanel() {
  const { activeUser, setActiveUser, users } = useUser()
  const [open, setOpen] = useState(false)

  const initials = (activeUser.name ?? '?').split(' ').map((n: string) => n[0] ?? '').join('').slice(0, 2)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="bg-card border border-border rounded-xl shadow-2xl w-64 overflow-hidden"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Switch Persona</span>
              <button onClick={() => setOpen(false)} className="text-text-secondary hover:text-text-primary transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Role groups */}
            <div className="py-2 max-h-80 overflow-y-auto">
              {ROLE_GROUPS.map(group => {
                const groupUsers = users.filter((u: User) => u.role === group.role)
                if (!groupUsers.length) return null
                return (
                  <div key={group.role}>
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${group.dot}`} />
                      <p className="text-text-secondary text-[10px] font-semibold uppercase tracking-wider">{group.label}</p>
                    </div>
                    {groupUsers.map((user: User) => (
                      <button
                        key={user.id}
                        onClick={() => { setActiveUser(user); setOpen(false) }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                          <span className={`text-[11px] font-bold ${ROLE_TEXT[user.role]}`}>
                            {(user.name ?? '?').split(' ').map((n: string) => n[0] ?? '').join('').slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary text-xs font-medium truncate">{user.name}</p>
                          <p className="text-text-secondary text-[10px] truncate">{user.title}</p>
                        </div>
                        {activeUser.id === user.id && <Check size={12} className="text-accent flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger pill */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2.5 bg-card border border-border hover:border-accent/40 rounded-full pl-1 pr-3 py-1 shadow-lg transition-colors"
      >
        {/* Avatar */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          activeUser.role === 'cto'          ? 'bg-accent/20'       :
          activeUser.role === 'divisionHead' ? 'bg-violet-500/20'   :
          activeUser.role === 'teamLead'     ? 'bg-warning/20'      :
          'bg-success/20'
        }`}>
          <span className={`text-[11px] font-bold ${ROLE_TEXT[activeUser.role]}`}>{initials}</span>
        </div>

        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${ROLE_DOT[activeUser.role]}`} />
            <p className="text-text-primary text-xs font-semibold leading-none">{activeUser.name.split(' ')[0]}</p>
          </div>
          <p className="text-text-secondary text-[10px] mt-0.5 leading-none">Demo Mode</p>
        </div>

        <ChevronUp
          size={13}
          className={`text-text-secondary transition-transform ${open ? '' : 'rotate-180'}`}
        />
      </motion.button>
    </div>
  )
}
