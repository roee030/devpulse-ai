// src/context/UserContext.tsx
import {
  createContext, useContext, useState, useEffect,
  ReactNode, useMemo,
} from 'react'
import type { User, Team, Developer, Division } from '../data/mockData'
import { createProvider } from '../lib/providers/createProvider'
import { useUnifiedData, IS_UNIFIED_LIVE } from './UnifiedDataContext'

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

// Static provider for users / divisions / teams (not from Unified yet)
const provider = createProvider()

export function UserProvider({ children }: { children: ReactNode }) {
  const unified = useUnifiedData()

  const [activeUser, setActiveUser] = useState<User | null>(null)
  const [users, setUsers]           = useState<User[]>([])
  const [teams, setTeams]           = useState<Team[]>([])
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [divisions, setDivisions]   = useState<Division[]>([])
  const [providerLoading, setProviderLoading] = useState(true)

  // Bootstrap from provider (users, teams, divisions)
  useEffect(() => {
    Promise.all([
      provider.getUsers(),
      provider.getTeams(),
      provider.getDivisions(),
    ]).then(([u, t, div]) => {
      setUsers(u)
      setTeams(t)
      setDivisions(div)
      setActiveUser(u[0])
      setProviderLoading(false)
    })
  }, [])

  // When Unified live data arrives, replace developer list
  useEffect(() => {
    if (IS_UNIFIED_LIVE && !unified.isLoading) {
      setDevelopers(unified.developers)
    }
  }, [unified.developers, unified.isLoading])

  // Seed developers from provider initially (or when not using Unified)
  useEffect(() => {
    if (!IS_UNIFIED_LIVE) {
      provider.getDevelopers().then(setDevelopers)
    }
  }, [])

  const isLoading = providerLoading || (IS_UNIFIED_LIVE && unified.isLoading)

  const visibleDivisions = useMemo(() => {
    if (!activeUser) return []
    if (activeUser.role === 'cto') return divisions
    if (activeUser.role === 'divisionHead') return divisions.filter(d => d.id === activeUser.divisionId)
    return []
  }, [activeUser, divisions])

  const visibleTeams = useMemo(() => {
    if (!activeUser) return []
    if (activeUser.role === 'cto') return teams
    if (activeUser.role === 'divisionHead') return teams.filter(t => t.divisionId === activeUser.divisionId)
    if (activeUser.role === 'teamLead') return teams.filter(t => t.id === activeUser.teamId)
    return []
  }, [activeUser, teams])

  const visibleDevelopers = useMemo(() => {
    if (!activeUser) return []
    if (activeUser.role === 'cto') return developers
    if (activeUser.role === 'divisionHead') return developers.filter(d => d.divisionId === activeUser.divisionId)
    if (activeUser.role === 'teamLead') return developers.filter(d => d.teamId === activeUser.teamId)
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
