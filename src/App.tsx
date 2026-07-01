// src/App.tsx
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import { UserProvider } from './context/UserContext'
import { UnifiedDataProvider } from './context/UnifiedDataContext'
import { CompanyProvider } from './context/CompanyContext'
import { AppShell } from './components/layout/AppShell'
import { Login } from './pages/Login'
import { Onboarding } from './pages/Onboarding'
import { ExecutiveDashboard } from './pages/ExecutiveDashboard'
import { TodaysBriefing } from './pages/TodaysBriefing'
import { SprintPrediction } from './pages/SprintPrediction'
import { DeveloperBriefing } from './pages/DeveloperBriefing'
import { BurnoutRisk } from './pages/BurnoutRisk'
import { ROICalculator } from './pages/ROICalculator'
import { Roadmap } from './pages/Roadmap'
import { AnnualView } from './pages/AnnualView'
import { IntegrationsPage } from './pages/Settings/IntegrationsPage'
import { CompanyPage } from './pages/Settings/CompanyPage'
import { Simulate } from './pages/Simulate'
import { AIEffort } from './pages/AIEffort'
import { TasksIntel } from './pages/TasksIntel'

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.25 }}
      >
        <Routes location={location}>
          <Route path="/"          element={<ExecutiveDashboard />} />
          <Route path="/today"     element={<TodaysBriefing />} />
          <Route path="/sprint"    element={<SprintPrediction />} />
          <Route path="/briefing"  element={<DeveloperBriefing />} />
          <Route path="/burnout"   element={<BurnoutRisk />} />
          <Route path="/roi"       element={<ROICalculator />} />
          <Route path="/roadmap"   element={<Roadmap />} />
          <Route path="/annual"    element={<AnnualView />} />
          <Route path="/ai-effort"              element={<AIEffort />} />
          <Route path="/tasks"                 element={<TasksIntel />} />
          <Route path="/settings/integrations" element={<IntegrationsPage />} />
          <Route path="/settings/company"      element={<CompanyPage />} />
          <Route path="/simulate"              element={<Simulate />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

const LS_ONBOARDED = 'devpulse-onboarded'

function AppContent() {
  const { isLoggedIn, isAuthLoading } = useAuth()
  const [isOnboarded, setIsOnboarded] = useState<boolean>(() =>
    !!localStorage.getItem(LS_ONBOARDED)
  )

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isLoggedIn) return <Login />

  if (!isOnboarded) {
    return (
      <Onboarding onComplete={() => {
        localStorage.setItem(LS_ONBOARDED, 'true')
        setIsOnboarded(true)
      }} />
    )
  }

  return (
    <UnifiedDataProvider>
      <UserProvider>
        <AppShell>
          <PendingRouteHandler />
          <AnimatedRoutes />
        </AppShell>
      </UserProvider>
    </UnifiedDataProvider>
  )
}

function PendingRouteHandler() {
  const navigate = useNavigate()
  useEffect(() => {
    const pending = localStorage.getItem('devpulse-pending-route')
    if (pending) {
      localStorage.removeItem('devpulse-pending-route')
      navigate(pending, { replace: true })
    }
  }, [navigate])
  return null
}

export default function App() {
  return (
    <BrowserRouter basename="/devpulse-ai">
      <ScrollToTop />
      <AuthProvider>
        <CompanyProvider>
          <AppContent />
        </CompanyProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
