// src/pages/Login.tsx
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { users } from '../data/mockData'

export const DEMO_PERSONA_KEY = 'devpulse-demo-persona-id'

const FEATURED = ['user-lior', 'user-maya', 'user-roi', 'user-avi', 'user-yael', 'user-noa']

const PERSONA_META: Record<string, { scope: string }> = {
  'user-lior': { scope: 'Full company · all 3 divisions · 25 developers' },
  'user-maya': { scope: 'Platform division · Backend & Infrastructure' },
  'user-roi':  { scope: 'Product division · Frontend & Mobile teams' },
  'user-avi':  { scope: 'Backend team · payment blocker · 5 devs' },
  'user-yael': { scope: 'Frontend team · 5 devs · sprint in progress' },
  'user-noa':  { scope: 'Personal view · your tasks, PRs & signals' },
}

const ROLE_BADGE: Record<string, { label: string; cls: string; dot: string }> = {
  cto:          { label: 'CTO',          cls: 'bg-accent/15 text-accent border-accent/30',           dot: 'bg-accent' },
  divisionHead: { label: 'VP',           cls: 'bg-violet-500/15 text-violet-400 border-violet-500/30', dot: 'bg-violet-400' },
  teamLead:     { label: 'Team Lead',    cls: 'bg-warning/15 text-warning border-warning/30',         dot: 'bg-warning' },
  developer:    { label: 'Engineer',     cls: 'bg-success/15 text-success border-success/30',         dot: 'bg-success' },
}

const AVATAR_COLOR: Record<string, string> = {
  cto:          'bg-accent/20 text-accent',
  divisionHead: 'bg-violet-500/20 text-violet-400',
  teamLead:     'bg-warning/20 text-warning',
  developer:    'bg-success/20 text-success',
}

const hasFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY

export function Login() {
  const { loginWithDemo, loginWithGoogle } = useAuth()

  function enterAs(userId: string) {
    localStorage.setItem(DEMO_PERSONA_KEY, userId)
    loginWithDemo()
  }

  const featured = FEATURED.map(id => users.find(u => u.id === id)).filter(Boolean)

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-violet-500/4 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative w-full max-w-2xl"
      >
        {/* Brand */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent/30"
          >
            <span className="text-white text-xl font-bold">DP</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-2xl font-bold text-text-primary"
          >
            DevPulse AI
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-text-secondary text-sm mt-1"
          >
            Engineering Intelligence — see your org through any lens
          </motion.p>
        </div>

        {/* Persona label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-text-secondary text-xs font-semibold uppercase tracking-widest text-center mb-4"
        >
          Choose your role to start the demo
        </motion.p>

        {/* Persona cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {featured.map((user, i) => {
            if (!user) return null
            const meta   = PERSONA_META[user.id]
            const badge  = ROLE_BADGE[user.role]
            const avatar = AVATAR_COLOR[user.role]
            const initials = user.name.split(' ').map((n: string) => n[0] ?? '').join('').slice(0, 2)
            return (
              <motion.button
                key={user.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => enterAs(user.id)}
                className="text-left bg-card border border-border hover:border-accent/40 rounded-xl p-4 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${avatar}`}>
                    <span className="text-sm font-bold">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-semibold truncate leading-snug">{user.name}</p>
                    <p className="text-text-secondary text-[11px] truncate mt-0.5">{user.title}</p>
                    <span className={`inline-flex items-center gap-1.5 mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                    {meta && (
                      <p className="text-text-secondary text-[11px] mt-2 leading-relaxed opacity-80">{meta.scope}</p>
                    )}
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Divider */}
        {hasFirebase && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-4 mt-8"
          >
            <div className="h-px flex-1 bg-border" />
            <span className="text-text-secondary text-xs">or sign in with your account</span>
            <div className="h-px flex-1 bg-border" />
          </motion.div>
        )}

        {hasFirebase && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            onClick={loginWithGoogle}
            className="mt-4 w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3 px-5 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </motion.button>
        )}

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          className="text-text-secondary text-xs text-center mt-6 leading-relaxed"
        >
          Synthetic demo data · No account required · NovaTech Inc (fictional company)
        </motion.p>
      </motion.div>
    </div>
  )
}
