import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans'
import "./globals.css";
import SideNav from "@/components/navigation/Sidenav";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/react"

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
    <html lang="en" className={GeistSans.variable}>
      <body className="min-h-screen">
        <Providers>
          <div className="flex h-screen overflow-hidden bg-background">
            <SideNav />
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto p-4">
                {children}
                <Analytics />
              </main>
              <Footer />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
