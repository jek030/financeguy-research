"use client";
import {
  HomeIcon,
  TableCellsIcon,
  UserGroupIcon,
  CalendarIcon,
  EyeIcon,
  CurrencyDollarIcon,
  BookOpenIcon,
  MapIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

const mainLinks = [
  { 
    name: 'Home', 
    href: '/', 
    icon: HomeIcon 
  },
  {
    name: 'Calendar',
    href: '/calendar',
    icon: CalendarIcon,
  },
  {
    name: 'Watchlists',
    href: '/watchlists',
    icon: EyeIcon,
  },
  {
    name: 'FMP Scans',
    href: '/scans',
    icon: MapIcon,
  },
];

const marketLinks = [
  {
    name: 'Crypto',
    href: '/crypto',
    icon: CurrencyDollarIcon,
  },
  {
    name: 'CANSLIM',
    href: '/canslim',
    icon: BookOpenIcon,
  },
];

interface NavLinksProps {
  collapsed?: boolean;
}

export default function NavLinks({ collapsed = false }: NavLinksProps) {
  const pathname = usePathname();

  const NavButton = ({ link }: { link: typeof mainLinks[0] }) => {
    const LinkIcon = link.icon;
    return (
      <Button
        key={link.name}
        asChild
        variant={pathname === link.href ? "secondary" : "ghost"}
        className={cn(
          "w-full",
          collapsed ? "justify-center px-2" : "justify-start"
        )}
      >
        <Link href={link.href}>
          <LinkIcon className="h-4 w-4" />
          {!collapsed && <span className="ml-2">{link.name}</span>}
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

