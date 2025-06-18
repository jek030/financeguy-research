import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans'
import "./globals.css";
import SideNav from "@/components/navigation/Sidenav";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/react"
import { ThemeProvider } from '@/components/theme-provider'


export const metadata: Metadata = {
  title: "Finance Guy",
  description: "Finance Guy Research Tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <head />
      <body suppressHydrationWarning className="min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <div className="flex h-screen overflow-hidden bg-background" suppressHydrationWarning>
              <SideNav />
              <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto">
                  {children}
                  <Analytics />
                </main>
                <Footer />
              </div>
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
