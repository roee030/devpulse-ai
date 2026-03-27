// src/pages/ExecutiveDashboard.tsx
import { motion } from 'framer-motion'
import { GitPullRequest, AlertTriangle, Target, Zap } from 'lucide-react'
import { useUser } from '../context/UserContext'
import { HealthRing } from '../components/ui/HealthRing'
import { MetricCard } from '../components/ui/MetricCard'
import { DeveloperCard } from '../components/ui/DeveloperCard'
import {
  divisions, teams, companyHealthScore, companyStalePRs, companyAtRiskTasks,
  sprint, getDevelopersByTeam, getTeamsByDivision
} from '../data/mockData'

function healthColor(score: number) {
  if (score >= 75) return 'border-l-success'
  if (score >= 50) return 'border-l-warning'
  return 'border-l-danger'
}

function DivisionCard({ div, delay }: { div: typeof divisions[0]; delay: number }) {
  const divTeams = getTeamsByDivision(div.id)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.015 }}
      className={`bg-card border border-border border-l-4 ${healthColor(div.healthScore)} rounded-xl p-5 cursor-pointer card-glow`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-text-primary font-semibold">{div.name}</p>
          <p className="text-text-secondary text-xs mt-0.5">{divTeams.length} teams</p>
        </div>
        <HealthRing score={div.healthScore} size={64} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-text-secondary text-xs">Stale PRs</p>
          <p className="text-warning font-semibold">{div.stalePRs}</p>
        </div>
        <div>
          <p className="text-text-secondary text-xs">At Risk</p>
          <p className="text-danger font-semibold">{div.atRiskTasks}</p>
        </div>
        <div>
          <p className="text-text-secondary text-xs">Points</p>
          <p className="text-text-primary font-semibold">{div.completedPoints}/{div.totalPoints}</p>
        </div>
      </div>
    </motion.div>
  )
}

function TeamCard({ team, delay }: { team: typeof teams[0]; delay: number }) {
  const devs = getDevelopersByTeam(team.id)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.015 }}
      className={`bg-card border border-border border-l-4 ${healthColor(team.healthScore)} rounded-xl p-5 cursor-pointer card-glow`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-text-primary font-semibold">{team.name}</p>
          <p className="text-text-secondary text-xs mt-0.5">{devs.length} developers</p>
        </div>
        <HealthRing score={team.healthScore} size={56} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-text-secondary text-xs">Stale PRs</p>
          <p className="text-warning font-semibold">{team.stalePRs}</p>
        </div>
        <div>
          <p className="text-text-secondary text-xs">At Risk</p>
          <p className="text-danger font-semibold">{team.atRiskTasks}</p>
        </div>
        <div>
          <p className="text-text-secondary text-xs">Points</p>
          <p className="text-text-primary font-semibold">{team.completedPoints}/{team.totalPoints}</p>
        </div>
      </div>
    </motion.div>
  )
}

export function ExecutiveDashboard() {
  const { activeUser, visibleDivisions, visibleTeams, visibleDevelopers } = useUser()

  const displayHealthScore =
    activeUser.role === 'cto' ? companyHealthScore
    : activeUser.role === 'divisionHead' ? (visibleDivisions[0]?.healthScore ?? 0)
    : activeUser.role === 'teamLead' ? (visibleTeams[0]?.healthScore ?? 0)
    : 0

  const displayStalePRs =
    activeUser.role === 'cto' ? companyStalePRs
    : visibleTeams.reduce((s, t) => s + t.stalePRs, 0) || visibleDivisions.reduce((s, d) => s + d.stalePRs, 0)

  const displayAtRisk =
    activeUser.role === 'cto' ? companyAtRiskTasks
    : visibleTeams.reduce((s, t) => s + t.atRiskTasks, 0) || visibleDivisions.reduce((s, d) => s + d.atRiskTasks, 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Executive Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">{sprint.name} · {sprint.completedPoints}/{sprint.totalPoints} points completed</p>
      </div>

      {/* Health + Metrics */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center min-w-[200px]"
        >
          <HealthRing score={displayHealthScore} size={140} />
          <p className="text-text-secondary text-sm mt-3 text-center">Team Health Score</p>
        </motion.div>

        <div className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard label="Stale PRs" value={displayStalePRs} color="warning" icon={<GitPullRequest size={16} />} trend="up" trendLabel="vs last sprint" delay={0.1} />
          <MetricCard label="At-Risk Tasks" value={displayAtRisk} color="danger" icon={<AlertTriangle size={16} />} trend="up" trendLabel={`${Math.round((displayAtRisk / sprint.totalPoints) * 100)}% of sprint`} delay={0.15} />
          <MetricCard label="Sprint Completion" value={sprint.completedPoints} unit={`/${sprint.totalPoints}`} color="default" icon={<Target size={16} />} trend="stable" trendLabel="points done" delay={0.2} />
          <MetricCard label="Team Velocity" value={Math.round(visibleDevelopers.reduce((s, d) => s + d.velocity, 0) * 10) / 10} unit=" pts/day" color="success" icon={<Zap size={16} />} trend="stable" trendLabel="avg across team" delay={0.25} />
        </div>
      </div>

      {/* Role-filtered entity grid */}
      {activeUser.role === 'cto' && (
        <div>
          <h2 className="text-text-primary font-semibold mb-4">Divisions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleDivisions.map((div, i) => <DivisionCard key={div.id} div={div} delay={i * 0.05} />)}
          </div>
        </div>
      )}
      {activeUser.role === 'divisionHead' && (
        <div>
          <h2 className="text-text-primary font-semibold mb-4">Teams in {visibleDivisions[0]?.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleTeams.map((t, i) => <TeamCard key={t.id} team={t} delay={i * 0.05} />)}
          </div>
        </div>
      )}
      {activeUser.role === 'teamLead' && (
        <div>
          <h2 className="text-text-primary font-semibold mb-4">Developers in {visibleTeams[0]?.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleDevelopers.map((dev, i) => <DeveloperCard key={dev.id} dev={dev} delay={i * 0.05} />)}
          </div>
        </div>
      )}
      {activeUser.role === 'developer' && visibleDevelopers[0] && (
        <div className="max-w-md">
          <h2 className="text-text-primary font-semibold mb-4">Your Summary</h2>
          <DeveloperCard dev={visibleDevelopers[0]} />
        </div>
      )}
    </div>
  )
}
