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
