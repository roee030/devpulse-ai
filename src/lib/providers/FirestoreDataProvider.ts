// src/lib/providers/FirestoreDataProvider.ts
import { collection, getDocs } from 'firebase/firestore'
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
