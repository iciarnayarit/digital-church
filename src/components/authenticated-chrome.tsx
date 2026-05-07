'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { PortalFooter } from '@/components/portal-footer';
import { PortalNavProvider } from '@/contexts/portal-nav-context';

const AUTH_ROUTE = /^\/(sign-in|sign-up)(\/|$)/;
const PUBLIC_CHROME_BYPASS_ROUTES = new Set(['/documentacion', '/documentation']);
const FOOTER_ROUTES = new Set([
  '/dashboard',
  '/churches/new',
  '/churches',
  '/ministries/new',
  '/ministries',
  '/ministries/assign-members',
  '/attendance',
  '/attendance/registro',
  '/attendance/report',
  '/donations/new',
  '/donations/fundraising/new',
  '/donations',
  '/donations/giving-statement',
  '/donations/fundraising',
  '/members/new',
  '/members',
  '/members/staff',
  '/inventario',
  '/inventario/nuevo',
  '/settings/new',
  '/settings/roles',
  '/settings/users',
]);

export function AuthenticatedChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [memberLookup, setMemberLookup] = React.useState<'idle' | 'exists' | 'missing'>('idle');
  const isAuthPage = pathname ? AUTH_ROUTE.test(pathname) : false;
  const isLandingHome = pathname === '/' || pathname === '';
  const normalizedPath = pathname?.replace(/\/+$/, '') || '/';
  const isPublicBypassRoute = PUBLIC_CHROME_BYPASS_ROUTES.has(normalizedPath);
  const showFooter = FOOTER_ROUTES.has(normalizedPath);
  const isMembersNewRoute = normalizedPath === '/members/new';

  React.useEffect(() => {
    let cancelled = false;
    if (isAuthPage || isLandingHome || isPublicBypassRoute) return;
    void (async () => {
      try {
        const meRes = await fetch('/api/members/me', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const meData = (await meRes.json().catch(() => ({}))) as { member?: { id?: string } | null };
        const hasMember = Boolean(meData.member?.id);
        if (!cancelled) {
          setMemberLookup(hasMember ? 'exists' : 'missing');
        }
        if (!hasMember) {
          if (!cancelled && !isMembersNewRoute) {
            router.replace('/members/new');
          }
          return;
        }

        if (isMembersNewRoute) {
          return;
        }

        const res = await fetch('/api/members/me-role', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json().catch(() => ({}))) as {
          isNew?: boolean;
          isAdmin?: boolean;
          staffRole?: string | null;
        };
        const adminBypass = data.isAdmin === true;
        if (!cancelled && !adminBypass && data.isNew === true) {
          router.replace('/members/new');
          return;
        }
        const role = String(data.staffRole ?? '')
          .trim()
          .toLowerCase();
        const allowCongreganteRoute =
          pathname === '/churches' ||
          pathname === '/members/staff' ||
          pathname === '/donations/new' ||
          pathname === '/donations' ||
          pathname === '/donations/giving-statement' ||
          pathname === '/donations/fundraising';
        if (!cancelled && !adminBypass && role === 'congregante' && !allowCongreganteRoute) {
          router.replace('/churches');
        }
      } catch {
        // Si falla la validación, no interrumpe la navegación normal.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthPage, isLandingHome, isMembersNewRoute, isPublicBypassRoute, pathname, router]);

  if (isAuthPage || isLandingHome || isPublicBypassRoute) {
    return <>{children}</>;
  }

  const showMembersOnlyPanel = isMembersNewRoute && memberLookup !== 'exists';
  if (showMembersOnlyPanel) {
    return <>{children}</>;
  }

  return (
    <PortalNavProvider>
      <div className="flex min-h-dvh w-full">
        <AppSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {children}
          {/*showFooter ? <PortalFooter /> : null*/}
        </div>
      </div>
    </PortalNavProvider>
  );
}
