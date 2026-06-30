// src/App.tsx
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import { UserProvider } from './context/UserContext'
import { UnifiedDataProvider } from './context/UnifiedDataContext'
import { AppShell } from './components/layout/AppShell'
import { Login } from './pages/Login'
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
          <Route path="/settings/integrations" element={<IntegrationsPage />} />
          <Route path="/settings/company"      element={<CompanyPage />} />
          <Route path="/simulate"              element={<Simulate />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function AppContent() {
  const { isLoggedIn, isAuthLoading } = useAuth()

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isLoggedIn) return <Login />

  return (
    <UserProvider>
      <UnifiedDataProvider>
        <AppShell>
          <AnimatedRoutes />
        </AppShell>
      </UnifiedDataProvider>
    </UserProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/devpulse-ai">
      <ScrollToTop />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}
