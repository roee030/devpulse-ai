// src/pages/ROICalculator.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Calendar, TrendingUp, Zap, ArrowRight } from 'lucide-react'
import { useCountUp } from '../hooks/useCountUp'

function AnimatedStat({ label, value, prefix = '', suffix = '', icon: Icon, color = 'text-accent', delay = 0 }: {
  label: string; value: number; prefix?: string; suffix?: string
  icon: any; color?: string; delay?: number
}) {
  const animated = useCountUp(Math.round(value), 800)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="bg-card border border-border rounded-xl p-5 card-glow"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className={color} />
        <p className="text-text-secondary text-sm">{label}</p>
      </div>
      <p className={`text-3xl font-bold ${color}`}>
        {prefix}{animated.toLocaleString()}{suffix}
      </p>
    </motion.div>
  )
}

export function ROICalculator() {
  const [devCount, setDevCount] = useState(20)
  const [meetingsPerWeek, setMeetingsPerWeek] = useState(3)
  const [hourlyRate, setHourlyRate] = useState(180)

  const meetingCost = devCount * meetingsPerWeek * 1.5 * 4.3 * hourlyRate
  const savings = meetingCost * 0.6
  const devpulseCost = 150 * devCount
  const paybackWeeks = devpulseCost > 0 ? Math.ceil(devpulseCost / (savings / 4.3)) : 0
  const annualROI = devpulseCost > 0 ? Math.round(((savings * 12 - devpulseCost * 12) / (devpulseCost * 12)) * 100) : 0

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">See what DevPulse saves you</h1>
        <p className="text-text-secondary text-sm mt-1">Calculate the efficiency gains based on your team size and meeting habits</p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Number of developers', value: devCount, setter: setDevCount, min: 1, max: 200, unit: 'devs' },
          { label: 'Status meetings per week', value: meetingsPerWeek, setter: setMeetingsPerWeek, min: 1, max: 20, unit: '/week' },
          { label: 'Average hourly rate', value: hourlyRate, setter: setHourlyRate, min: 50, max: 500, unit: '₪/hr' },
        ].map(({ label, value, setter, min, max, unit }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-5"
          >
            <p className="text-text-secondary text-sm mb-4">{label}</p>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-4xl font-bold text-text-primary">{value}</span>
              <span className="text-text-secondary text-sm mb-1">{unit}</span>
            </div>
            <input
              type="range" min={min} max={max} value={value}
              onChange={e => setter(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1.5 rounded-full appearance-none bg-border cursor-pointer"
            />
            <div className="flex justify-between mt-1">
              <span className="text-text-secondary text-xs">{min}</span>
              <span className="text-text-secondary text-xs">{max}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Output cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <AnimatedStat label="Monthly meeting cost" value={meetingCost} prefix="₪" icon={DollarSign} color="text-danger" delay={0} />
        <AnimatedStat label="Monthly savings with DevPulse" value={savings} prefix="₪" icon={TrendingUp} color="text-success" delay={0.05} />
        <AnimatedStat label="Pays for itself in" value={paybackWeeks} suffix=" weeks" icon={Calendar} color="text-accent" delay={0.1} />
        <AnimatedStat label="Annual ROI" value={annualROI} suffix="%" icon={Zap} color="text-warning" delay={0.15} />
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-r from-accent/20 via-accent/10 to-transparent border border-accent/30 rounded-2xl p-5 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6"
      >
        <div>
          <h2 className="text-text-primary text-xl font-bold mb-2">Ready to reclaim your team's time?</h2>
          <p className="text-text-secondary text-sm">Join 200+ engineering teams already using DevPulse AI to eliminate the Status Gap.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 bg-accent text-white font-semibold px-6 py-3 rounded-xl text-sm whitespace-nowrap"
        >
          Start Free Trial <ArrowRight size={16} />
        </motion.button>
      </motion.div>
    </div>
  )
}
