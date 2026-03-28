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
