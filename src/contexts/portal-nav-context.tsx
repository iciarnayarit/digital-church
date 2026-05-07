'use client';

import * as React from 'react';
import {
  filterSidebarNavByModules,
  portalEntriesToSidebarItems,
  type SidebarNavItem,
} from '@/lib/portal-nav-data';
import { isInventoryGlobalStaffRole, isOnboardingStaffRole } from '@/lib/pastor-church-access';

type PortalNavContextValue = {
  navItems: SidebarNavItem[];
  loading: boolean;
};

/** Solo Super administrador y Administrador general ven el módulo Configuración en el lateral. */
function stripConfigurationNavUnlessGlobal(
  items: SidebarNavItem[],
  staffRole: string | null | undefined
): SidebarNavItem[] {
  if (isInventoryGlobalStaffRole(staffRole)) return items;
  return items.filter((item) => !('subItems' in item && item.subItems && item.label === 'Configuración'));
}

function relabelMembersNew(navItems: SidebarNavItem[], label: string): SidebarNavItem[] {
  return navItems.map((item) => {
    if (!('subItems' in item) || !item.subItems) return item;
    return {
      ...item,
      subItems: item.subItems.map((sub) =>
        sub.href === '/members/new' ? { ...sub, label } : sub
      ),
    };
  });
}

const PortalNavContext = React.createContext<PortalNavContextValue>({
  navItems: stripConfigurationNavUnlessGlobal(portalEntriesToSidebarItems(), null),
  loading: true,
});

export function PortalNavProvider({ children }: { children: React.ReactNode }) {
  const [navItems, setNavItems] = React.useState<SidebarNavItem[]>(() =>
    stripConfigurationNavUnlessGlobal(portalEntriesToSidebarItems(), null)
  );
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/members/me-nav', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json().catch(() => ({}))) as {
          access?: string;
          modules?: Record<string, string[]>;
          staffRole?: string | null;
        };
        if (cancelled) return;
        const base = portalEntriesToSidebarItems();
        const filtered =
          data.access === 'partial' && data.modules && typeof data.modules === 'object'
            ? filterSidebarNavByModules(base, data.modules)
            : base;
        const withoutSettings = stripConfigurationNavUnlessGlobal(filtered, data.staffRole);
        const role = String(data.staffRole ?? '').trim().toLowerCase();
        const shouldShowMyData =
          isOnboardingStaffRole(data.staffRole) || role === 'congregante';
        setNavItems(
          shouldShowMyData ? relabelMembersNew(withoutSettings, 'Mis datos') : withoutSettings
        );
      } catch {
        if (!cancelled) {
          setNavItems(stripConfigurationNavUnlessGlobal(portalEntriesToSidebarItems(), null));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = React.useMemo(() => ({ navItems, loading }), [navItems, loading]);

  return <PortalNavContext.Provider value={value}>{children}</PortalNavContext.Provider>;
}

export function usePortalNav() {
  return React.useContext(PortalNavContext);
}
