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
