// src/App.tsx
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { UserProvider } from './context/UserContext'
import { AppShell } from './components/layout/AppShell'
import { ExecutiveDashboard } from './pages/ExecutiveDashboard'
import { SprintPrediction } from './pages/SprintPrediction'
import { DeveloperBriefing } from './pages/DeveloperBriefing'
import { BurnoutRisk } from './pages/BurnoutRisk'
import { ROICalculator } from './pages/ROICalculator'

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
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
          <Route path="/sprint"    element={<SprintPrediction />} />
          <Route path="/briefing"  element={<DeveloperBriefing />} />
          <Route path="/burnout"   element={<BurnoutRisk />} />
          <Route path="/roi"       element={<ROICalculator />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppShell>
          <AnimatedRoutes />
        </AppShell>
      </UserProvider>
    </BrowserRouter>
  )
}
