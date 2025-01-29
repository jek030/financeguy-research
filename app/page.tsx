import Header from "@/components/layout/Header";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col">
       <main className="flex-1 overflow-y-auto p-4">
              <div className="h-full rounded-lg border border-border bg-card p-4">
                <h1 className="text-2xl font-bold text-card-foreground mb-4">Welcome to Finance Guy</h1>
                <p className="text-muted-foreground">This is a placeholder content area. Your main content will go here.</p>
              </div>
            </main>
    </div>
  );
}
