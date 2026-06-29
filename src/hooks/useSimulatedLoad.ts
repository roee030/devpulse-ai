// src/hooks/useSimulatedLoad.ts
import { useState, useEffect } from 'react'

export function useSimulatedLoad(ms = 600): boolean {
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), ms)
    return () => clearTimeout(timer)
  }, [ms])
  return isLoading
}
