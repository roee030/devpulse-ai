# Firebase Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Firebase Auth + Firestore persistence with an adapter layer, plus a Settings UI for managing company config and integrations (GitHub, Jira, Linear, Slack).

**Architecture:** TypeScript `IDataProvider` interface with two implementations — `MockDataProvider` (wraps existing mock data, used when `VITE_DATA_PROVIDER=mock`) and `FirestoreDataProvider` (reads from Firestore, used when `VITE_DATA_PROVIDER=firebase`). Firebase Auth scopes all Firestore reads to a `companyId` stored in the user's custom claims. Settings pages write integration configs to `companies/{companyId}/integrations`.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Firebase 10 (Auth + Firestore), Vitest + @testing-library/react

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Firebase and test tooling**

```bash
npm install firebase
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Step 2: Configure Vitest in vite.config.ts**

The existing `vite.config.ts` likely only has the React plugin. Add a `test` block:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

**Step 3: Create test setup file**

Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

**Step 4: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 5: Verify Vitest works**

```bash
npm run test:run
```
Expected: `No test files found` (that's fine — setup is working)

**Step 6: Commit**

```bash
git add package.json vite.config.ts src/test/setup.ts
git commit -m "chore: add firebase and vitest dependencies"
```

---

## Task 2: Firebase project setup

**Files:**
- Create: `src/lib/firebase.ts`
- Create: `.env.example`
- Create: `.env.local` (gitignored — you fill this in)

**Step 1: Create a Firebase project**

1. Go to https://console.firebase.google.com
2. Click "Add project" → name it `devpulse-ai` → disable Google Analytics → Create
3. In the project, go to **Project settings** → **Your apps** → click the `</>` (Web) icon
4. Register app as `devpulse-web` → copy the `firebaseConfig` object shown

**Step 2: Enable Firestore**

In Firebase console → **Firestore Database** → Create database → Start in **test mode** → choose a region close to you → Done

**Step 3: Enable Authentication**

In Firebase console → **Authentication** → Get started → **Email/Password** → Enable → Save

**Step 4: Create .env.example**

```bash
# .env.example — copy to .env.local and fill in values from Firebase console
# Project settings > Your apps > SDK setup and configuration
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# "mock" uses local mock data, "firebase" uses Firestore
VITE_DATA_PROVIDER=mock
```

**Step 5: Create .env.local with your values**

Copy `.env.example` to `.env.local` and paste in the values from the Firebase console. Set `VITE_DATA_PROVIDER=mock` for now.

**Step 6: Create src/lib/firebase.ts**

```ts
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app  = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db   = getFirestore(app)
```

**Step 7: Commit**

```bash
git add src/lib/firebase.ts .env.example
git commit -m "feat: add Firebase init with env-based config"
```

> Note: Never commit `.env.local` — it should already be in `.gitignore` (Vite projects include it by default). Verify with `git status`.

---

## Task 3: Define IDataProvider interface

**Files:**
- Create: `src/lib/providers/IDataProvider.ts`
- Test: `src/lib/providers/IDataProvider.test.ts`

**Step 1: Write the failing test**

Create `src/lib/providers/IDataProvider.test.ts`:

```ts
// src/lib/providers/IDataProvider.test.ts
import { describe, it, expect } from 'vitest'
import type { IDataProvider } from './IDataProvider'

describe('IDataProvider', () => {
  it('is a valid TypeScript interface (compile check)', () => {
    // This test just verifies the interface can be used as a type
    const mockProvider: IDataProvider = {
      getTeams: async () => [],
      getDevelopers: async () => [],
      getDivisions: async () => [],
      getUsers: async () => [],
      getSprintBurndown: async () => [],
      getVelocityHistory: async () => [],
      getRoiHistory: async () => [],
    }
    expect(typeof mockProvider.getTeams).toBe('function')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run
```
Expected: FAIL — `Cannot find module './IDataProvider'`

**Step 3: Create the interface**

Create `src/lib/providers/IDataProvider.ts`:

```ts
// src/lib/providers/IDataProvider.ts
import type {
  Team, Developer, Division, User, BurndownDay,
} from '../../data/mockData'

export interface VelocityPoint {
  sprint: string
  points: number
}

export interface RoiPoint {
  month: string
  saved: number
  invested: number
}

export interface IDataProvider {
  getTeams():           Promise<Team[]>
  getDevelopers():      Promise<Developer[]>
  getDivisions():       Promise<Division[]>
  getUsers():           Promise<User[]>
  getSprintBurndown():  Promise<BurndownDay[]>
  getVelocityHistory(): Promise<VelocityPoint[]>
  getRoiHistory():      Promise<RoiPoint[]>
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/providers/IDataProvider.ts src/lib/providers/IDataProvider.test.ts
git commit -m "feat: define IDataProvider interface"
```

---

## Task 4: Create MockDataProvider

**Files:**
- Create: `src/lib/providers/MockDataProvider.ts`
- Test: `src/lib/providers/MockDataProvider.test.ts`

**Step 1: Write the failing test**

Create `src/lib/providers/MockDataProvider.test.ts`:

```ts
// src/lib/providers/MockDataProvider.test.ts
import { describe, it, expect } from 'vitest'
import { MockDataProvider } from './MockDataProvider'

describe('MockDataProvider', () => {
  const provider = new MockDataProvider()

  it('getTeams returns a non-empty array', async () => {
    const teams = await provider.getTeams()
    expect(teams.length).toBeGreaterThan(0)
    expect(teams[0]).toHaveProperty('id')
    expect(teams[0]).toHaveProperty('name')
  })

  it('getDevelopers returns a non-empty array', async () => {
    const devs = await provider.getDevelopers()
    expect(devs.length).toBeGreaterThan(0)
    expect(devs[0]).toHaveProperty('id')
  })

  it('getDivisions returns a non-empty array', async () => {
    const divisions = await provider.getDivisions()
    expect(divisions.length).toBeGreaterThan(0)
  })

  it('getUsers returns a non-empty array', async () => {
    const users = await provider.getUsers()
    expect(users.length).toBeGreaterThan(0)
  })

  it('getSprintBurndown returns an array of BurndownDay objects', async () => {
    const burndown = await provider.getSprintBurndown()
    expect(burndown.length).toBeGreaterThan(0)
    expect(burndown[0]).toHaveProperty('day')
    expect(burndown[0]).toHaveProperty('ideal')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run
```
Expected: FAIL — `Cannot find module './MockDataProvider'`

**Step 3: Create MockDataProvider**

Open `src/data/mockData.ts` and find the exported arrays: `teams`, `developers`, `divisions`, `users`, `sprintBurndown`, `velocityHistory`, `roiHistory`. (If some names differ, adjust the imports below.)

Create `src/lib/providers/MockDataProvider.ts`:

```ts
// src/lib/providers/MockDataProvider.ts
import type { IDataProvider, VelocityPoint, RoiPoint } from './IDataProvider'
import {
  teams, developers, divisions, users, sprintBurndown,
} from '../../data/mockData'

// Pull velocity/ROI data from mockData — adjust names if they differ
import { velocityHistory, roiHistory } from '../../data/mockData'

export class MockDataProvider implements IDataProvider {
  getTeams()           { return Promise.resolve([...teams]) }
  getDevelopers()      { return Promise.resolve([...developers]) }
  getDivisions()       { return Promise.resolve([...divisions]) }
  getUsers()           { return Promise.resolve([...users]) }
  getSprintBurndown()  { return Promise.resolve([...sprintBurndown]) }
  getVelocityHistory() { return Promise.resolve([...velocityHistory] as VelocityPoint[]) }
  getRoiHistory()      { return Promise.resolve([...roiHistory] as RoiPoint[]) }
}
```

> Note: If `velocityHistory` or `roiHistory` don't exist in mockData.ts yet, create minimal stubs there:
> ```ts
> export const velocityHistory = [{ sprint: 'S1', points: 42 }]
> export const roiHistory = [{ month: 'Jan', saved: 12000, invested: 4000 }]
> ```

**Step 4: Run test to verify it passes**

```bash
npm run test:run
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/providers/MockDataProvider.ts src/lib/providers/MockDataProvider.test.ts src/data/mockData.ts
git commit -m "feat: implement MockDataProvider wrapping existing mock data"
```

---

## Task 5: Create FirestoreDataProvider

**Files:**
- Create: `src/lib/providers/FirestoreDataProvider.ts`

> No unit test here — Firestore reads require a live connection or complex emulator setup. Integration testing is deferred.

**Step 1: Create FirestoreDataProvider**

```ts
// src/lib/providers/FirestoreDataProvider.ts
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import type { IDataProvider, VelocityPoint, RoiPoint } from './IDataProvider'
import type { Team, Developer, Division, User, BurndownDay } from '../../data/mockData'

export class FirestoreDataProvider implements IDataProvider {
  private companyId: string

  constructor(companyId: string) {
    this.companyId = companyId
  }

  private col(name: string) {
    return collection(db, 'companies', this.companyId, name)
  }

  async getTeams(): Promise<Team[]> {
    const snap = await getDocs(this.col('teams'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Team))
  }

  async getDevelopers(): Promise<Developer[]> {
    const snap = await getDocs(this.col('developers'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Developer))
  }

  async getDivisions(): Promise<Division[]> {
    const snap = await getDocs(this.col('divisions'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Division))
  }

  async getUsers(): Promise<User[]> {
    const snap = await getDocs(this.col('users'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as User))
  }

  async getSprintBurndown(): Promise<BurndownDay[]> {
    const snap = await getDocs(this.col('sprintBurndown'))
    return snap.docs.map(d => d.data() as BurndownDay)
  }

  async getVelocityHistory(): Promise<VelocityPoint[]> {
    const snap = await getDocs(this.col('velocityHistory'))
    return snap.docs.map(d => d.data() as VelocityPoint)
  }

  async getRoiHistory(): Promise<RoiPoint[]> {
    const snap = await getDocs(this.col('roiHistory'))
    return snap.docs.map(d => d.data() as RoiPoint)
  }
}
```

**Step 2: Build check**

```bash
npm run build
```
Expected: Clean build, no TypeScript errors.

**Step 3: Commit**

```bash
git add src/lib/providers/FirestoreDataProvider.ts
git commit -m "feat: implement FirestoreDataProvider"
```

---

## Task 6: Create provider factory and wire into UserContext

**Files:**
- Create: `src/lib/providers/createProvider.ts`
- Modify: `src/context/UserContext.tsx`
- Test: `src/lib/providers/createProvider.test.ts`

**Step 1: Write the failing test**

Create `src/lib/providers/createProvider.test.ts`:

```ts
// src/lib/providers/createProvider.test.ts
import { describe, it, expect, vi } from 'vitest'

// Mock firebase before importing createProvider
vi.mock('../firebase', () => ({ db: {}, auth: {} }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
}))

import { createProvider } from './createProvider'
import { MockDataProvider } from './MockDataProvider'
import { FirestoreDataProvider } from './FirestoreDataProvider'

describe('createProvider', () => {
  it('returns MockDataProvider when VITE_DATA_PROVIDER is mock', () => {
    // @ts-ignore
    import.meta.env.VITE_DATA_PROVIDER = 'mock'
    const provider = createProvider()
    expect(provider).toBeInstanceOf(MockDataProvider)
  })

  it('returns FirestoreDataProvider when VITE_DATA_PROVIDER is firebase', () => {
    // @ts-ignore
    import.meta.env.VITE_DATA_PROVIDER = 'firebase'
    const provider = createProvider('company-123')
    expect(provider).toBeInstanceOf(FirestoreDataProvider)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run
```
Expected: FAIL — `Cannot find module './createProvider'`

**Step 3: Create the factory**

```ts
// src/lib/providers/createProvider.ts
import { MockDataProvider } from './MockDataProvider'
import { FirestoreDataProvider } from './FirestoreDataProvider'
import type { IDataProvider } from './IDataProvider'

export function createProvider(companyId?: string): IDataProvider {
  if (import.meta.env.VITE_DATA_PROVIDER === 'firebase') {
    if (!companyId) throw new Error('companyId required for FirestoreDataProvider')
    return new FirestoreDataProvider(companyId)
  }
  return new MockDataProvider()
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run
```
Expected: PASS

**Step 5: Update UserContext to use the provider**

Open `src/context/UserContext.tsx`. Replace the direct mockData imports with provider-based data loading.

Replace the entire file content:

```tsx
// src/context/UserContext.tsx
import {
  createContext, useContext, useState, useEffect,
  ReactNode, useMemo,
} from 'react'
import type { User, Team, Developer, Division } from '../data/mockData'
import { createProvider } from '../lib/providers/createProvider'
import {
  getDevelopersByTeam, getDevelopersByDivision, getTeamsByDivision,
} from '../data/mockData'

interface UserContextValue {
  activeUser: User
  setActiveUser: (user: User) => void
  users: User[]
  visibleDivisions: Division[]
  visibleTeams: Team[]
  visibleDevelopers: Developer[]
  isLoading: boolean
}

const UserContext = createContext<UserContextValue | null>(null)
const provider = createProvider()

export function UserProvider({ children }: { children: ReactNode }) {
  const [activeUser, setActiveUser] = useState<User | null>(null)
  const [users, setUsers]           = useState<User[]>([])
  const [teams, setTeams]           = useState<Team[]>([])
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [divisions, setDivisions]   = useState<Division[]>([])
  const [isLoading, setIsLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      provider.getUsers(),
      provider.getTeams(),
      provider.getDevelopers(),
      provider.getDivisions(),
    ]).then(([u, t, d, div]) => {
      setUsers(u)
      setTeams(t)
      setDevelopers(d)
      setDivisions(div)
      setActiveUser(u[0])
      setIsLoading(false)
    })
  }, [])

  const visibleDivisions = useMemo(() => {
    if (!activeUser) return []
    if (activeUser.role === 'cto') return divisions
    if (activeUser.role === 'divisionHead') return divisions.filter(d => d.id === activeUser.divisionId)
    return []
  }, [activeUser, divisions])

  const visibleTeams = useMemo(() => {
    if (!activeUser) return []
    if (activeUser.role === 'cto') return teams
    if (activeUser.role === 'divisionHead') return getTeamsByDivision(activeUser.divisionId!)
    if (activeUser.role === 'teamLead') return teams.filter(t => t.id === activeUser.teamId)
    return []
  }, [activeUser, teams])

  const visibleDevelopers = useMemo(() => {
    if (!activeUser) return []
    if (activeUser.role === 'cto') return developers
    if (activeUser.role === 'divisionHead') return getDevelopersByDivision(activeUser.divisionId!)
    if (activeUser.role === 'teamLead') return getDevelopersByTeam(activeUser.teamId!)
    if (activeUser.role === 'developer') return developers.filter(d => d.id === activeUser.developerId)
    return []
  }, [activeUser, developers])

  if (isLoading || !activeUser) return null

  return (
    <UserContext.Provider value={{
      activeUser, setActiveUser, users,
      visibleDivisions, visibleTeams, visibleDevelopers, isLoading,
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
```

**Step 6: Smoke test the app**

```bash
npm run dev
```
Open http://localhost:5173 — all existing pages should work exactly as before (since `VITE_DATA_PROVIDER=mock`).

**Step 7: Commit**

```bash
git add src/lib/providers/createProvider.ts src/lib/providers/createProvider.test.ts src/context/UserContext.tsx
git commit -m "feat: wire IDataProvider into UserContext, env-selectable mock vs firestore"
```

---

## Task 7: Firebase Auth context

**Files:**
- Create: `src/context/AuthContext.tsx`
- Modify: `src/App.tsx`

**Step 1: Create AuthContext**

```tsx
// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth'
import { auth } from '../lib/firebase'

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  isAuthLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      setFirebaseUser(user)
      setIsAuthLoading(false)
    })
  }, [])

  const login  = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password).then(() => {})

  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ firebaseUser, isAuthLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

**Step 2: Wrap App with AuthProvider**

Open `src/App.tsx`. Add `AuthProvider` around `UserProvider`:

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import { UserProvider } from './context/UserContext'
import { AppShell } from './components/layout/AppShell'
import { ExecutiveDashboard } from './pages/ExecutiveDashboard'
import { SprintPrediction } from './pages/SprintPrediction'
import { DeveloperBriefing } from './pages/DeveloperBriefing'
import { BurnoutRisk } from './pages/BurnoutRisk'
import { ROICalculator } from './pages/ROICalculator'
import { IntegrationsPage } from './pages/Settings/IntegrationsPage'
import { CompanyPage } from './pages/Settings/CompanyPage'

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
          <Route path="/"                      element={<ExecutiveDashboard />} />
          <Route path="/sprint"                element={<SprintPrediction />} />
          <Route path="/briefing"              element={<DeveloperBriefing />} />
          <Route path="/burnout"               element={<BurnoutRisk />} />
          <Route path="/roi"                   element={<ROICalculator />} />
          <Route path="/settings/integrations" element={<IntegrationsPage />} />
          <Route path="/settings/company"      element={<CompanyPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          <AppShell>
            <AnimatedRoutes />
          </AppShell>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

> Note: `IntegrationsPage` and `CompanyPage` don't exist yet — the build will fail until Task 9 and 10. Create stub files for now:
> - `src/pages/Settings/IntegrationsPage.tsx` → `export function IntegrationsPage() { return <div>Integrations</div> }`
> - `src/pages/Settings/CompanyPage.tsx` → `export function CompanyPage() { return <div>Company</div> }`

**Step 3: Build check**

```bash
npm run build
```
Expected: Clean build.

**Step 4: Commit**

```bash
git add src/context/AuthContext.tsx src/App.tsx src/pages/Settings/
git commit -m "feat: add Firebase Auth context and settings routes"
```

---

## Task 8: Settings nav link in Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Step 1: Read current Sidebar**

Open `src/components/layout/Sidebar.tsx` and find the nav link list.

**Step 2: Add Settings section**

Find where the nav links are defined (look for the array of `{ to, icon, label }` objects or similar). Add a Settings group at the bottom, before the closing section/nav tag:

```tsx
// Add this import at the top with the other lucide icons:
import { Settings } from 'lucide-react'

// Add to the nav links array (or add as a separate bottom section):
{ to: '/settings/integrations', icon: Settings, label: 'Integrations' },
```

Also add a "Company" link pointing to `/settings/company`.

The exact implementation depends on how the Sidebar currently renders links — read the file first and match the existing pattern exactly.

**Step 3: Verify in browser**

```bash
npm run dev
```
Check that "Integrations" and "Company" appear in the sidebar and clicking them navigates without crashing.

**Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: add Settings nav links to sidebar"
```

---

## Task 9: IntegrationCard component

**Files:**
- Create: `src/components/integrations/IntegrationCard.tsx`

**Step 1: Define the integration config type**

At the top of `IntegrationCard.tsx`, define the types inline (no separate file needed for one use):

```ts
export type IntegrationStatus = 'connected' | 'error' | 'not_connected'

export interface IntegrationConfig {
  id: string
  type: 'github' | 'jira' | 'linear' | 'slack'
  label: string
  description: string
  status: IntegrationStatus
  icon: React.ComponentType<{ className?: string }>
}
```

**Step 2: Create IntegrationCard**

```tsx
// src/components/integrations/IntegrationCard.tsx
import { CheckCircle, AlertCircle, Circle, ChevronRight } from 'lucide-react'
import type { IntegrationConfig } from './types'

const statusConfig = {
  connected:     { icon: CheckCircle,  color: 'text-emerald-400', label: 'Connected' },
  error:         { icon: AlertCircle,  color: 'text-red-400',     label: 'Error' },
  not_connected: { icon: Circle,       color: 'text-slate-500',   label: 'Not connected' },
}

interface Props {
  integration: IntegrationConfig
  onConnect: (integration: IntegrationConfig) => void
}

export function IntegrationCard({ integration, onConnect }: Props) {
  const { icon: StatusIcon, color, label } = statusConfig[integration.status]
  const Icon = integration.icon

  return (
    <button
      onClick={() => onConnect(integration)}
      className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800 transition-all text-left group"
    >
      <div className="p-2.5 rounded-lg bg-slate-700/50 shrink-0">
        <Icon className="w-5 h-5 text-slate-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200">{integration.label}</p>
        <p className="text-xs text-slate-500 truncate">{integration.description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`flex items-center gap-1 text-xs ${color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {label}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
      </div>
    </button>
  )
}
```

> Note: The type import uses `'./types'` — you'll create that file next or inline the types in the same file.

**Step 3: Create the shared types file**

Create `src/components/integrations/types.ts`:

```ts
// src/components/integrations/types.ts
export type IntegrationStatus = 'connected' | 'error' | 'not_connected'

export interface IntegrationConfig {
  id: string
  type: 'github' | 'jira' | 'linear' | 'slack'
  label: string
  description: string
  status: IntegrationStatus
  icon: React.ComponentType<{ className?: string }>
}
```

And update `IntegrationCard.tsx` to import from `'./types'` instead of defining inline.

**Step 4: Build check**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add src/components/integrations/
git commit -m "feat: add IntegrationCard component"
```

---

## Task 10: ConnectModal component

**Files:**
- Create: `src/components/integrations/ConnectModal.tsx`

This modal opens when the user clicks an IntegrationCard. It renders a form with the right fields per integration type, and saves the config to Firestore (or mock stores it in memory).

```tsx
// src/components/integrations/ConnectModal.tsx
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { IntegrationConfig } from './types'

const FIELDS: Record<string, { label: string; key: string; placeholder: string; type?: string }[]> = {
  github: [
    { label: 'Organization', key: 'org', placeholder: 'my-org' },
    { label: 'Repository', key: 'repo', placeholder: 'my-repo' },
    { label: 'Personal Access Token', key: 'token', placeholder: 'ghp_...', type: 'password' },
  ],
  jira: [
    { label: 'Domain', key: 'domain', placeholder: 'mycompany.atlassian.net' },
    { label: 'Project Key', key: 'projectKey', placeholder: 'ENG' },
    { label: 'API Token', key: 'token', placeholder: 'ATATT...', type: 'password' },
    { label: 'Email', key: 'email', placeholder: 'you@company.com' },
  ],
  linear: [
    { label: 'API Key', key: 'token', placeholder: 'lin_api_...', type: 'password' },
    { label: 'Team ID', key: 'teamId', placeholder: 'team-id' },
  ],
  slack: [
    { label: 'Bot Token', key: 'token', placeholder: 'xoxb-...', type: 'password' },
    { label: 'Channel ID', key: 'channelId', placeholder: 'C0XXXXXXXX' },
  ],
}

interface Props {
  integration: IntegrationConfig | null
  companyId: string
  onClose: () => void
  onSaved: () => void
}

export function ConnectModal({ integration, companyId, onClose, onSaved }: Props) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!integration) return null

  const fields = FIELDS[integration.type] ?? []

  async function handleSave() {
    setIsSaving(true)
    setError(null)
    try {
      await setDoc(
        doc(db, 'companies', companyId, 'integrations', integration!.id),
        { type: integration!.type, config: values, status: 'active', lastSynced: serverTimestamp() },
      )
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">Connect {integration.label}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{f.label}</label>
              <input
                type={f.type ?? 'text'}
                placeholder={f.placeholder}
                value={values[f.key] ?? ''}
                onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          ))}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save connection
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Build check**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/components/integrations/ConnectModal.tsx
git commit -m "feat: add ConnectModal for integration config"
```

---

## Task 11: IntegrationsPage

**Files:**
- Modify: `src/pages/Settings/IntegrationsPage.tsx` (replace the stub)

```tsx
// src/pages/Settings/IntegrationsPage.tsx
import { useState } from 'react'
import { Github, MessageSquare, Trello, BarChart2 } from 'lucide-react'
import { IntegrationCard } from '../../components/integrations/IntegrationCard'
import { ConnectModal } from '../../components/integrations/ConnectModal'
import type { IntegrationConfig } from '../../components/integrations/types'

// Fallback companyId — replace with real value from AuthContext when VITE_DATA_PROVIDER=firebase
const COMPANY_ID = import.meta.env.VITE_COMPANY_ID ?? 'demo-company'

const INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'github',
    type: 'github',
    label: 'GitHub',
    description: 'Sync pull requests, commits, and code review activity',
    status: 'not_connected',
    icon: Github,
  },
  {
    id: 'jira',
    type: 'jira',
    label: 'Jira',
    description: 'Import sprints, issues, and velocity data',
    status: 'not_connected',
    icon: Trello,
  },
  {
    id: 'linear',
    type: 'linear',
    label: 'Linear',
    description: 'Import cycles, issues, and team metrics',
    status: 'not_connected',
    icon: BarChart2,
  },
  {
    id: 'slack',
    type: 'slack',
    label: 'Slack',
    description: 'Send burnout alerts and sprint summaries to a channel',
    status: 'not_connected',
    icon: MessageSquare,
  },
]

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(INTEGRATIONS)
  const [active, setActive] = useState<IntegrationConfig | null>(null)

  function handleSaved() {
    if (!active) return
    setIntegrations(prev =>
      prev.map(i => i.id === active.id ? { ...i, status: 'connected' } : i)
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-100">Integrations</h1>
        <p className="text-sm text-slate-500 mt-1">Connect your tools to start pulling real data into DevPulse.</p>
      </div>

      <div className="space-y-3">
        {integrations.map(integration => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConnect={setActive}
          />
        ))}
      </div>

      <ConnectModal
        integration={active}
        companyId={COMPANY_ID}
        onClose={() => setActive(null)}
        onSaved={handleSaved}
      />
    </div>
  )
}
```

**Step 2: Verify in browser**

```bash
npm run dev
```
Navigate to `/settings/integrations`. Each card should appear. Clicking "GitHub" should open the modal with the right fields. (Saving will write to Firestore if firebase is configured, otherwise it'll fail gracefully with an error message in the modal.)

**Step 3: Commit**

```bash
git add src/pages/Settings/IntegrationsPage.tsx
git commit -m "feat: build IntegrationsPage with live cards and connect modal"
```

---

## Task 12: CompanyPage

**Files:**
- Modify: `src/pages/Settings/CompanyPage.tsx` (replace the stub)

```tsx
// src/pages/Settings/CompanyPage.tsx
import { useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'

const COMPANY_ID = import.meta.env.VITE_COMPANY_ID ?? 'demo-company'

export function CompanyPage() {
  const [name, setName]       = useState('')
  const [plan, setPlan]       = useState<'free' | 'pro' | 'enterprise'>('free')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSave() {
    setIsSaving(true)
    setSaved(false)
    setError(null)
    try {
      await setDoc(doc(db, 'companies', COMPANY_ID), { name, plan }, { merge: true })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setError(e.message ?? 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-100">Company settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your organization profile.</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Company name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Acme Corp"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Plan</label>
          <select
            value={plan}
            onChange={e => setPlan(e.target.value as typeof plan)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {isSaving
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
              : saved
              ? <><Save className="w-3.5 h-3.5" /> Saved!</>
              : <><Save className="w-3.5 h-3.5" /> Save changes</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify in browser**

Navigate to `/settings/company`. Fill in a company name, click Save. If Firebase is configured, check the Firestore console to confirm the document was written to `companies/demo-company`.

**Step 3: Commit**

```bash
git add src/pages/Settings/CompanyPage.tsx
git commit -m "feat: build CompanyPage with Firestore persistence"
```

---

## Task 13: Final build + smoke test

**Step 1: Run all tests**

```bash
npm run test:run
```
Expected: All tests pass.

**Step 2: Production build**

```bash
npm run build
```
Expected: Clean build, no TypeScript errors.

**Step 3: Preview production build**

```bash
npm run preview
```
Open http://localhost:4173. Navigate through all pages. Confirm settings pages render and the connect modal opens.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify final build passes"
```

---

## Firestore security rules (production checklist)

Before shipping to users, update Firestore rules in the Firebase console (Firestore → Rules):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{companyId}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.token.companyId == companyId;
    }
  }
}
```

This ensures each authenticated user can only read/write their own company's data.

---

## Summary of new files

| File | Purpose |
|------|---------|
| `src/lib/firebase.ts` | Firebase app init |
| `src/lib/providers/IDataProvider.ts` | Data access interface |
| `src/lib/providers/MockDataProvider.ts` | Wraps existing mock data |
| `src/lib/providers/FirestoreDataProvider.ts` | Reads from Firestore |
| `src/lib/providers/createProvider.ts` | Env-based factory |
| `src/context/AuthContext.tsx` | Firebase Auth state |
| `src/components/integrations/types.ts` | Shared types |
| `src/components/integrations/IntegrationCard.tsx` | Per-integration card UI |
| `src/components/integrations/ConnectModal.tsx` | Config form modal |
| `src/pages/Settings/IntegrationsPage.tsx` | Integrations settings page |
| `src/pages/Settings/CompanyPage.tsx` | Company settings page |
| `src/test/setup.ts` | Vitest global setup |
| `.env.example` | Env var template |
