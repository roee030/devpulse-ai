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
