"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  const { user } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (user) {
      router.push('/watchlists');
    }
  }, [user, router]);
  
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      if (isSignUp) {
        // Sign up
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/watchlists`,
          },
        });
        
        if (error) throw error;
        
        setMessage('Check your email for the confirmation link');
      } else {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        router.push('/watchlists');
      }
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? 'Create an Account' : 'Sign In'}</CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Create an account to start managing your watchlists'
              : 'Sign in to access your watchlists'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <div className="bg-green-100 p-3 rounded-md mb-4 text-green-800">
              {message}
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 p-3 rounded-md mb-4 text-red-800">
              {error}
            </div>
          )}
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm"
            >
              {isSignUp 
                ? 'Already have an account? Sign In' 
                : 'Don\'t have an account? Sign Up'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 