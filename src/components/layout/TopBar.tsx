// src/components/layout/TopBar.tsx
import { useState } from 'react'
import { Bell, ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import { User } from '../../data/mockData'

const roleLabel: Record<string, string> = {
  cto: 'C-Level',
  divisionHead: 'Division Head',
  teamLead: 'Team Lead',
  developer: 'Developer',
}

const roleGroups = [
  { label: 'C-Level', role: 'cto' },
  { label: 'Division Heads', role: 'divisionHead' },
  { label: 'Team Leads', role: 'teamLead' },
  { label: 'Developers', role: 'developer' },
]

export function TopBar() {
  const { activeUser, setActiveUser, users } = useUser()
  const [open, setOpen] = useState(false)

  return (
    <header className="hidden md:flex h-14 bg-card border-b border-border items-center justify-between px-6 fixed top-0 left-60 right-0 z-30">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-text-secondary">NovaTech</span>
        <span className="text-border">/</span>
        <span className="text-text-primary font-medium">{activeUser.title}</span>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative text-text-secondary hover:text-text-primary transition-colors">
          <Bell size={18} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full pulse-red" />
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2.5 bg-bg border border-border rounded-lg px-3 py-1.5 text-sm hover:border-accent/50 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-xs font-semibold">
                {activeUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div className="text-left">
              <p className="text-text-primary font-medium text-xs leading-tight">{activeUser.name}</p>
              <p className="text-text-secondary text-xs leading-tight">{roleLabel[activeUser.role]}</p>
            </div>
            <ChevronDown size={14} className={`text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
              >
                {roleGroups.map(group => {
                  const groupUsers = users.filter(u => u.role === group.role)
                  if (!groupUsers.length) return null
                  return (
                    <div key={group.role}>
                      <div className="px-3 pt-3 pb-1">
                        <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">{group.label}</p>
                      </div>
                      {groupUsers.map((user: User) => (
                        <button
                          key={user.id}
                          onClick={() => { setActiveUser(user); setOpen(false) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                            <span className="text-accent text-xs font-semibold">
                              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-text-primary text-xs font-medium truncate">{user.name}</p>
                            <p className="text-text-secondary text-xs truncate">{user.title}</p>
                          </div>
                          {activeUser.id === user.id && <Check size={13} className="text-accent flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
