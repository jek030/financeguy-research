'use client';

import { useAuth } from "@/lib/context/auth-context";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col">
      <main className="flex-1 overflow-y-auto p-4">
        <div className="h-full rounded-lg border border-border bg-card p-4">
          <h1 className="text-2xl font-bold text-card-foreground mb-4">
            {user ? `Welcome to Finance Guy, ${user.email}` : 'Welcome to Finance Guy'}
          </h1>
          <p className="text-muted-foreground">Finance Guy is a research tool made for investors. Search a company&apos;s ticker symbol to get started.</p>
          <br></br>
          <p className="text-muted-foreground">Stay tuned for future updates:</p>
          <ul className="list-disc list-inside text-muted-foreground mt-4 pl-8">
            <li>Account authentification ✅</li>
            <li>Watchlists saved to your account. Currently watchlists only persist on the current browser session.</li>
            <li>Improved earnings calendar</li>
            <li>Better crypto support</li>
            <li>Mobile layout improvements</li>
            <li>Advanced market scanners</li>
            <li>Updated resource library</li>
            <li>And more!</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
