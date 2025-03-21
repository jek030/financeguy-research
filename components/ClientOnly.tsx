'use client'

import { useEffect, useState, ReactNode } from 'react'

interface ClientOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * ClientOnly component ensures content is only rendered after hydration
 * to prevent hydration mismatches for code that depends on client-side data
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Return fallback (or nothing) on server/first render
  if (!isClient) {
    return fallback
  }
  
  // Return children on subsequent renders
  return <>{children}</>
} 