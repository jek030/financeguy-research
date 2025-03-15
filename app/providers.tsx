"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MobileMenuProvider } from "@/lib/context/MobileMenuContext"
import { AuthProvider } from "@/lib/context/auth-context"

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MobileMenuProvider>
          {children}
        </MobileMenuProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
} 