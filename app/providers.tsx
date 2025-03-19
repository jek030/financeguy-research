"use client"

import { ThemeProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState, useEffect } from "react"
import { AuthProvider } from "@/lib/context/auth-context"
import { MobileMenuProvider } from "@/lib/context/MobileMenuContext"
import { ThemeFixer } from "@/components/ThemeFixer"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [mounted, setMounted] = useState(false)

  // Wait for mounting before rendering full content
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="system" 
        enableSystem
        disableTransitionOnChange
        enableColorScheme={false}
        storageKey="financeguy-theme"
        forcedTheme={!mounted ? undefined : undefined}
      >
        <ThemeFixer />
        <AuthProvider>
          <MobileMenuProvider>
            {mounted ? children : 
              <div style={{ visibility: 'hidden' }}>{children}</div>
            }
          </MobileMenuProvider>
        </AuthProvider>
      </ThemeProvider>
      {mounted && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
} 