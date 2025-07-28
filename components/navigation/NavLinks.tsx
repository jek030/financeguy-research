"use client";
import {
  HomeIcon,
  CalendarIcon,
  EyeIcon,
  CurrencyDollarIcon,
  BookmarkIcon,
  MapIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { electrolize } from '@/lib/fonts';
import { useMobileMenu } from '@/lib/context/MobileMenuContext';

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
];

const marketLinks = [
  {
    name: 'Crypto',
    href: '/crypto',
    icon: CurrencyDollarIcon,
  },
  /*{
    name: 'CANSLIM',
    href: '/canslim',
    icon: BookOpenIcon,
  },*/
  {
    name: 'Resources',
    href: '/resources',
    icon: BookmarkIcon,
  },
];


export default function NavLinks() {
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
    
    return (
      <Button
        key={link.name}
        asChild
        variant={pathname === link.href ? "secondary" : "ghost"}
        className={cn(
          "w-full transition-all duration-200 justify-start",
          electrolize.className,
          pathname === link.href ? "text-lg font-bold" : "text-sm"
        )}
      >
        <Link href={link.href} onClick={isMobile ? handleClick : undefined}>
          <LinkIcon className={cn(
            "flex-shrink-0",
            pathname === link.href ? "h-5 w-5" : "h-4 w-4"
          )} />
          <span className="ml-2 whitespace-nowrap">
            {link.name}
          </span>
        </Link>
      </Button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="px-2 py-2">
        <div className="space-y-1">
          {mainLinks.map((link) => (
            <NavButton key={link.name} link={link} />
          ))}
        </div>
      </div>

      <div className="px-4">
        <div className="h-px bg-border" />
      </div>

      <div className="px-2 py-2">
        <div className="space-y-1">
          {marketLinks.map((link) => (
            <NavButton key={link.name} link={link} />
          ))}
        </div>
      </div>
    </div>
  );
}

