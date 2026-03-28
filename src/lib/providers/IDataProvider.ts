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
