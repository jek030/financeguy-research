'use client';

import { AuthForm } from "@/components/auth/AuthForm";
import { useAuth } from "@/lib/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Use useEffect to handle redirects instead of during render
  useEffect(() => {
    if (user && !isLoading) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render the form if user is already authenticated
  if (user) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <main className="w-full max-w-md p-4">
        <AuthForm />
      </main>
    </div>
  );
} 