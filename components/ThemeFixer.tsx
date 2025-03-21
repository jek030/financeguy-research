'use client'

import { useEffect, useState } from 'react'

export function ThemeFixer() {
  const [mounted, setMounted] = useState(false)
  
  // Only run after hydration to avoid mismatches
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    // Add a 1px hidden div that doesn't affect layout but helps avoid hydration errors
    return <div aria-hidden style={{ height: 0, width: 0, margin: 0, padding: 0, position: 'absolute', visibility: 'hidden' }} />
  }
  
  // Once mounted, return null so this component doesn't render anything
  return null
} 