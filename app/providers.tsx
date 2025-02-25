"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MobileMenuProvider } from "@/lib/context/MobileMenuContext"

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MobileMenuProvider>
        {children}
      </MobileMenuProvider>
    </QueryClientProvider>
  )
} 