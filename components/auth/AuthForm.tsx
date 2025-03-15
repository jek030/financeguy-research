'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useRouter } from 'next/navigation';
import { config } from '@/lib/config';

export function AuthForm() {
  // Read signup enabled flag directly from environment variable as fallback
  const signupEnabledEnv = process.env.NEXT_PUBLIC_SIGNUP_ENABLED === 'true';
  // Use either the config value or the direct environment variable
  const isSignupEnabled = config.auth.signupEnabled || signupEnabledEnv;
  
  // Debug log to help troubleshoot
  console.log('Signup enabled status:', { 
    fromConfig: config.auth.signupEnabled,
    fromEnv: signupEnabledEnv,
    finalValue: isSignupEnabled,
    rawEnvValue: process.env.NEXT_PUBLIC_SIGNUP_ENABLED
  });
  
  const [activeTab, setActiveTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [signInSuccess, setSignInSuccess] = useState(false);
  const router = useRouter();

  // Clear fields when changing tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setEmail('');
    setPassword('');
    setMessage(null);
  };

  // Use an effect to handle navigation after successful sign-in
  useEffect(() => {
    if (signInSuccess) {
      router.push('/');
    }
  }, [signInSuccess, router]);

  // Check if email already exists in the system
  async function checkEmailExists(email: string): Promise<boolean> {
    try {
      // Try to sign in with an invalid password to check if the account exists
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: 'check_email_exists_only',
      });

      // If we get an invalid login error (not user not found), the email exists
      return error?.message?.includes('Invalid login credentials') ?? false;
    } catch (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
  }

  async function handleSignUp() {
    if (!isSignupEnabled) {
      setMessage({ 
        type: 'error', 
        text: 'We apologize, but new account registration is temporarily unavailable. Please try again later.'
      });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      
      // Check if the email already exists
      const emailExists = await checkEmailExists(email);
      if (emailExists) {
        setMessage({
          type: 'error',
          text: 'An account with this email already exists. Please sign in instead.'
        });
        return;
      }
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      
      setMessage({ 
        type: 'success', 
        text: 'Check your email for the confirmation link'
      });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'An error occurred during sign up'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    try {
      setLoading(true);
      setMessage(null);
      
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Set sign-in success state instead of directly navigating
      if (data.session) {
        setSignInSuccess(true);
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'An error occurred during sign in'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full shadow-lg border-2">
      <Tabs defaultValue="signin" value={activeTab} onValueChange={handleTabChange}>
        <CardHeader className="space-y-3">
          <CardTitle className="text-center text-3xl font-bold">Finance Guy</CardTitle>
          <CardDescription className="text-center text-base">
            Sign In to Finance Guy
          </CardDescription>
          <TabsList className="grid w-full grid-cols-2 mt-4">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent>
          {message && (
            <Alert className={`mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
          
          <TabsContent value="signin">
            <form onSubmit={(e) => { e.preventDefault(); handleSignIn(); }}>
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full py-6 text-base">
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </div>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            {!isSignupEnabled && (
              <Alert className="mb-6 bg-red-50 text-red-800 border-red-200">
                <AlertDescription className="font-semibold">
                  New account registration is temporarily unavailable due to system maintenance. We apologize for the inconvenience.
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={(e) => { e.preventDefault(); handleSignUp(); }}>
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={!isSignupEnabled}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password-signup">Password</Label>
                  <Input
                    id="password-signup"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={!isSignupEnabled}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={!isSignupEnabled || loading} 
                  className={`w-full py-6 text-base ${!isSignupEnabled ? 'opacity-50' : ''}`}
                >
                  {loading ? 'Signing up...' : (isSignupEnabled ? 'Sign Up' : 'Sign Up Unavailable')}
                </Button>
              </div>
            </form>
          </TabsContent>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Tabs>
    </Card>
  );
} 