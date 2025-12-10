"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/context/auth-context";
import { useTheme } from "next-themes";
import { LogIn, LogOut, Settings, User, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/DropdownMenu";

interface ProfileMenuProps {
  isCollapsed: boolean;
}

export function ProfileMenu({ isCollapsed }: ProfileMenuProps) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/settings";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className={cn(
            "w-full flex items-center rounded-md bg-muted text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors duration-200 justify-start h-10 px-0 outline-none",
            "data-[state=open]:bg-accent"
          )}
        >
          <div className="flex items-center justify-center shrink-0 w-[44px]">
             {user ? (
               <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs border border-primary/20">
                 {user.email?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
               </div>
             ) : (
                <div className="h-8 w-8 rounded-full bg-muted-foreground/10 flex items-center justify-center border border-border">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
             )}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col items-start overflow-hidden">
                <span className="truncate text-sm font-medium">
                    {user ? (user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]) : 'Guest'}
                </span>
                {user && (
                    <span className="truncate text-xs text-muted-foreground w-full text-left">
                        {user.email}
                    </span>
                )}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" side="right" sideOffset={10}>
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
            <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                </Link>
            </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
            <DropdownMenuRadioItem value="light">
                <Sun className="mr-2 h-4 w-4" />
                <span>Light</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
                <Monitor className="mr-2 h-4 w-4" />
                <span>System</span>
            </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        
        <DropdownMenuSeparator />
        
        {user ? (
             <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
             </DropdownMenuItem>
        ) : (
             <DropdownMenuItem asChild>
                <Link href="/login" className="cursor-pointer">
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>Sign In</span>
                </Link>
             </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

