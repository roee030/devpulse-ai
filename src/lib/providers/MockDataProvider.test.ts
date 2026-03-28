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
