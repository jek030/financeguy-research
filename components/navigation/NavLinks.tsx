"use client";
import {
  HomeIcon,
  CalendarIcon,
  EyeIcon,
  CurrencyDollarIcon,
  MapIcon,
  ChartBarIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { electrolize } from '@/lib/fonts';
import { useMobileMenu } from '@/lib/context/MobileMenuContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";

const mainLinks = [
  { 
    name: 'Home', 
    href: '/', 
    icon: HomeIcon 
  },
  {
    name: 'Earnings Calendar',
    href: '/calendar',
    icon: CalendarIcon,
  },
  {
    name: 'Watchlists',
    href: '/watchlists',
    icon: EyeIcon,
  },
  {
    name: 'Market Scans',
    href: '/scans',
    icon: MapIcon,
  },
  {
    name: 'Realized Gains',
    href: '/realized-gains',
    icon: ChartBarIcon,
  },
  {
    name: 'Portfolio',
    href: '/portfolio',
    icon: BriefcaseIcon,
  },
];

const marketLinks = [
  {
    name: 'Crypto',
    href: '/crypto',
    icon: CurrencyDollarIcon,
  },
];


export default function NavLinks({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, toggleSidebar } = useMobileMenu();

  const NavButton = ({ link }: { link: typeof mainLinks[0] }) => {
    const LinkIcon = link.icon;
    
    const handleClick = (e: React.MouseEvent) => {
      if (isMobile) {
        e.preventDefault();
        toggleSidebar(); // Close sidebar on mobile
        // Small delay to allow animation to start before navigation
        setTimeout(() => {
          router.push(link.href);
        }, 100);
      }
    };
    
    const ButtonElement = (
      <Button
        asChild
        variant={pathname === link.href ? "secondary" : "ghost"}
        className={cn(
          "w-full transition-all duration-200 justify-start px-0 gap-0",
          electrolize.className,
          pathname === link.href ? "text-lg font-bold" : "text-sm"
        )}
      >
        <Link href={link.href} onClick={isMobile ? handleClick : undefined} className="flex items-center w-full">
          <div className="flex items-center justify-center shrink-0 w-[44px]">
            <LinkIcon className={cn(
              "flex-shrink-0 transition-all",
              pathname === link.href ? "h-6 w-6" : "h-5 w-5"
            )} />
          </div>
          {!isCollapsed && (
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">
              {link.name}
            </span>
          )}
        </Link>
      </Button>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              {ButtonElement}
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{link.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return ButtonElement;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="py-2">
        <div className="space-y-1">
          {mainLinks.map((link) => (
            <NavButton key={link.name} link={link} />
          ))}
        </div>
      </div>

      <div className="px-4">
        <div className="h-px bg-border" />
      </div>

      <div className="py-2">
        <div className="space-y-1">
          {marketLinks.map((link) => (
            <NavButton key={link.name} link={link} />
          ))}
        </div>
      </div>
    </div>
  );
}
