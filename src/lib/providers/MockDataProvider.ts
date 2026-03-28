// src/lib/providers/MockDataProvider.ts
import type { IDataProvider, VelocityPoint, RoiPoint } from './IDataProvider'
import {
  teams, developers, divisions, users, sprintBurndown,
  velocityHistory, roiHistory,
} from '../../data/mockData'

export class MockDataProvider implements IDataProvider {
  getTeams()           { return Promise.resolve([...teams]) }
  getDevelopers()      { return Promise.resolve([...developers]) }
  getDivisions()       { return Promise.resolve([...divisions]) }
  getUsers()           { return Promise.resolve([...users]) }
  getSprintBurndown()  { return Promise.resolve([...sprintBurndown]) }
  getVelocityHistory() { return Promise.resolve([...velocityHistory] as VelocityPoint[]) }
  getRoiHistory()      { return Promise.resolve([...roiHistory] as RoiPoint[]) }
}
