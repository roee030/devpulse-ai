// src/context/UserContext.tsx
import { createContext, useContext, useState, ReactNode, useMemo } from 'react'
import {
  users, developers, teams, divisions, User,
  getDevelopersByTeam, getDevelopersByDivision, getTeamsByDivision,
} from '../data/mockData'

interface UserContextValue {
  activeUser: User
  setActiveUser: (user: User) => void
  users: User[]
  visibleDivisions: typeof divisions
  visibleTeams: typeof teams
  visibleDevelopers: typeof developers
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [activeUser, setActiveUser] = useState<User>(users[0]) // default: CTO

  const visibleDivisions = useMemo(() => {
    if (activeUser.role === 'cto') return divisions
    if (activeUser.role === 'divisionHead') return divisions.filter(d => d.id === activeUser.divisionId)
    return []
  }, [activeUser])

  const visibleTeams = useMemo(() => {
    if (activeUser.role === 'cto') return teams
    if (activeUser.role === 'divisionHead') return getTeamsByDivision(activeUser.divisionId!)
    if (activeUser.role === 'teamLead') return teams.filter(t => t.id === activeUser.teamId)
    return []
  }, [activeUser])

  const visibleDevelopers = useMemo(() => {
    if (activeUser.role === 'cto') return developers
    if (activeUser.role === 'divisionHead') return getDevelopersByDivision(activeUser.divisionId!)
    if (activeUser.role === 'teamLead') return getDevelopersByTeam(activeUser.teamId!)
    if (activeUser.role === 'developer') return developers.filter(d => d.id === activeUser.developerId)
    return []
  }, [activeUser])

  return (
    <UserContext.Provider value={{ activeUser, setActiveUser, users, visibleDivisions, visibleTeams, visibleDevelopers }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
