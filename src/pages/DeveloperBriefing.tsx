// src/pages/DeveloperBriefing.tsx
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useUser } from '../context/UserContext'
import { DeveloperCard } from '../components/ui/DeveloperCard'

export function DeveloperBriefing() {
  const { activeUser, visibleDevelopers } = useUser()
  const isSoloView = activeUser.role === 'developer'

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-text-primary">Developer Daily Briefing</h1>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 text-text-secondary text-sm mb-8"
      >
        <Sparkles size={14} className="text-accent" />
        <span>Your AI-powered focus for today</span>
      </motion.div>

      {isSoloView && visibleDevelopers[0] ? (
        <div className="max-w-lg mx-auto">
          <DeveloperCard dev={visibleDevelopers[0]} />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-4 bg-accent/10 border border-accent/20 rounded-xl p-4"
          >
            <p className="text-accent text-sm font-medium mb-1">Here's what will help you finish today smoothly</p>
            <p className="text-text-secondary text-xs leading-relaxed">
              Focus on your top in-progress task first. You have {visibleDevelopers[0].tasks.filter(t => t.status === 'blocked').length} blocked task(s) that may need a sync with your team lead.
            </p>
          </motion.div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleDevelopers.map((dev, i) => (
            <DeveloperCard key={dev.id} dev={dev} delay={i * 0.05} />
          ))}
        </div>
      )}
    </div>
  )
}
