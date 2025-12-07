"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { supabase } from '@/lib/supabase';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useWatchlist } from '@/hooks/useWatchlist';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";
import { Pencil, X, Check } from "lucide-react";

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { portfolios, isLoading: portfolioLoading } = usePortfolio();
  const { watchlists, isLoading: watchlistLoading } = useWatchlist();
  
  const [name, setName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalName, setOriginalName] = useState('');

  // Update local state when user data is loaded
  useEffect(() => {
    if (user) {
      const userName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      setName(userName);
      setOriginalName(userName);
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name, name: name }
      });

      if (error) {
        throw error;
      }

      setOriginalName(name);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const cancelEdit = () => {
    setName(originalName);
    setIsEditing(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
            <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Please sign in to view your settings.</CardDescription>
            </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your personal account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email || ''} disabled readOnly />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <div className="flex gap-2">
              <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={!isEditing}
                  className={!isEditing ? "bg-muted" : ""}
              />
              {!isEditing ? (
                <Button 
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="icon"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handleUpdateProfile} 
                    disabled={isUpdating || !name.trim()}
                    size="icon"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={cancelEdit}
                    variant="ghost"
                    size="icon"
                    disabled={isUpdating}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="userId">User ID</Label>
            <Input id="userId" value={user.id} disabled readOnly className="font-mono text-sm" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="createdAt">Created At</Label>
            <Input id="createdAt" value={formatDate(user.created_at)} disabled readOnly className="font-mono text-sm" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Portfolios</CardTitle>
            <div className="text-sm text-muted-foreground">
              {portfolioLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <>Total: {portfolios.length}</>
              )}
            </div>
          </CardHeader>
          <CardContent>
             {portfolioLoading ? (
               <div className="space-y-2">
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-full" />
               </div>
             ) : portfolios.length > 0 ? (
               <ul className="list-disc list-inside space-y-1 text-sm">
                 {portfolios.map((p) => (
                   <li key={p.portfolio_key} className="text-muted-foreground">
                     {p.portfolio_name}
                   </li>
                 ))}
               </ul>
             ) : (
               <p className="text-sm text-muted-foreground">No portfolios found.</p>
             )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Watchlists</CardTitle>
            <div className="text-sm text-muted-foreground">
              {watchlistLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <>Total: {watchlists.length}</>
              )}
            </div>
          </CardHeader>
          <CardContent>
             {watchlistLoading ? (
               <div className="space-y-2">
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-full" />
               </div>
             ) : watchlists.length > 0 ? (
               <ul className="list-disc list-inside space-y-1 text-sm">
                 {watchlists.map((w) => (
                   <li key={w.id} className="text-muted-foreground">
                     {w.name}
                   </li>
                 ))}
               </ul>
             ) : (
               <p className="text-sm text-muted-foreground">No watchlists found.</p>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
