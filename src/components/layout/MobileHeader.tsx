// src/components/layout/MobileHeader.tsx
import { useState } from 'react'
import { Bell, ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import { User } from '../../data/mockData'

const roleLabel: Record<string, string> = {
  cto: 'CTO',
  divisionHead: 'Div. Head',
  teamLead: 'Team Lead',
  developer: 'Developer',
}

export function MobileHeader() {
  const { activeUser, setActiveUser, users } = useUser()
  const [open, setOpen] = useState(false)

  return (
    <header className="md:hidden h-14 bg-card border-b border-border flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-30">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
          <span className="text-white text-xs font-bold">DP</span>
        </div>
        <span className="text-text-primary font-semibold text-sm">DevPulse AI</span>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative text-text-secondary">
          <Bell size={18} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full pulse-red" />
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 bg-bg border border-border rounded-lg px-2.5 py-1.5"
          >
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-xs font-semibold">
                {activeUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <ChevronDown size={13} className="text-text-secondary" />
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
              >
                {users.map((user: User) => (
                  <button
                    key={user.id}
                    onClick={() => { setActiveUser(user); setOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent text-xs font-semibold">
                        {user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-xs font-medium truncate">{user.name}</p>
                      <p className="text-text-secondary text-xs truncate">{user.title}</p>
                    </div>
                    {activeUser.id === user.id && <Check size={13} className="text-accent flex-shrink-0" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
