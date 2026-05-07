import type { LucideIcon } from 'lucide-react';
import {
  BarChart,
  Church,
  ClipboardList,
  FileText,
  HandHelping,
  Heart,
  LayoutDashboard,
  List,
  Megaphone,
  Package,
  PiggyBank,
  Plus,
  Search,
  Settings,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';

export type PortalNavSubItem = { href: string; label: string; icon: LucideIcon };

export type PortalNavEntry =
  | {
      kind: 'link';
      module: string;
      href: string;
      label: string;
      icon: LucideIcon;
    }
  | {
      kind: 'group';
      module: string;
      label: string;
      icon: LucideIcon;
      subItems: PortalNavSubItem[];
    };

/** Árbol del menú lateral y matriz de permisos (etiquetas deben coincidir con la UI de roles). */
export const PORTAL_NAV_ENTRIES: PortalNavEntry[] = [
  { kind: 'link', module: 'Panel', href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  {
    kind: 'group',
    module: 'Directorio',
    label: 'Directorio',
    icon: Users,
    subItems: [
      { href: '/members/new', icon: UserPlus, label: 'Mis Datos' },
      { href: '/members/add', icon: Plus, label: 'Añadir' },
      { href: '/members', icon: Users, label: 'Miembros' },
      { href: '/members/staff', icon: UserCog, label: 'Pastoral' },
    ],
  },
  {
    kind: 'group',
    module: 'Iglesias',
    label: 'Iglesias',
    icon: Church,
    subItems: [
      { href: '/churches/new', icon: Plus, label: 'Añadir Ubicación' },
      { href: '/churches', icon: Search, label: 'Buscar' },
    ],
  },
  {
    kind: 'group',
    module: 'Ministerios',
    label: 'Ministerios',
    icon: HandHelping,
    subItems: [
      { href: '/ministries/new', icon: Plus, label: 'Nuevo Ministerio' },
      { href: '/ministries', icon: List, label: 'Gestionar' },
      { href: '/ministries/assign-members', icon: UserPlus, label: 'Asignar Miembros' },
    ],
  },
  {
    kind: 'group',
    module: 'Asistencia',
    label: 'Asistencia',
    icon: BarChart,
    subItems: [
      { href: '/attendance', icon: Search, label: 'Servicio' },
      { href: '/attendance/registro', icon: ClipboardList, label: 'Registro' },
      { href: '/attendance/report', icon: FileText, label: 'Reporte' },
    ],
  },
  {
    kind: 'group',
    module: 'Ofrendas',
    label: 'Ofrendas',
    icon: Heart,
    subItems: [
      { href: '/donations/new', icon: Plus, label: 'Añadir Ofrenda' },
      { href: '/donations/fundraising/new', icon: Megaphone, label: 'Crear Campaña' },
      { href: '/donations', icon: Heart, label: 'Donaciones y ofrendas' },
      { href: '/donations/giving-statement', icon: FileText, label: 'Declaración de Donación' },
      { href: '/donations/fundraising', icon: PiggyBank, label: 'Recaudación de Fondos' },
    ],
  },
  {
    kind: 'group',
    module: 'Inventario',
    label: 'Inventario',
    icon: Package,
    subItems: [
      { href: '/inventario', icon: List, label: 'Gestión de inventario' },
      { href: '/inventario/nuevo', icon: Plus, label: 'Nueva Artículo' },
    ],
  },
  {
    kind: 'group',
    module: 'Configuración',
    label: 'Configuración',
    icon: Settings,
    subItems: [
      { href: '/settings/new', icon: Plus, label: 'Roles y Permisos' },
      { href: '/settings/roles', icon: List, label: 'Lista de Roles' },
      { href: '/settings/users', icon: Users, label: 'Usuarios' },
    ],
  },
];

export const PORTAL_PERMISSIONS_BY_MODULE: Record<string, string[]> = PORTAL_NAV_ENTRIES.reduce(
  (acc, e) => {
    if (e.kind === 'link') acc[e.module] = [e.label];
    else acc[e.module] = e.subItems.map((s) => s.label);
    return acc;
  },
  {} as Record<string, string[]>
);

/** Para reutilizar en formularios (orden estable). */
export const PORTAL_MODULE_KEYS = PORTAL_NAV_ENTRIES.map((e) => e.module);

export type SidebarNavItem =
  | { href: string; label: string; icon: LucideIcon; subItems?: undefined }
  | { label: string; icon: LucideIcon; subItems: PortalNavSubItem[] };

export function portalEntriesToSidebarItems(): SidebarNavItem[] {
  return PORTAL_NAV_ENTRIES.map((e) => {
    if (e.kind === 'link') {
      return { href: e.href, label: e.label, icon: e.icon };
    }
    return { label: e.label, icon: e.icon, subItems: e.subItems };
  });
}

export function filterSidebarNavByModules(
  items: SidebarNavItem[],
  modules: Record<string, string[]> | null
): SidebarNavItem[] {
  if (modules == null) return items;

  const normalize = (v: string) => v.trim().toLowerCase();
  const getAllowedForModule = (moduleName: string): string[] | undefined => {
    const target = normalize(moduleName);
    const key = Object.keys(modules).find((k) => normalize(k) === target);
    return key ? modules[key] : undefined;
  };

  const out: SidebarNavItem[] = [];
  for (const item of items) {
    if ('href' in item && item.href && !('subItems' in item && item.subItems)) {
      const allowed = getAllowedForModule('Panel');
      const allowedSet = new Set((allowed ?? []).map(normalize));
      if (
        allowedSet.has('*') ||
        allowedSet.has('panel') ||
        allowedSet.has(normalize(item.label)) ||
        allowedSet.has(normalize(item.href))
      ) {
        out.push(item);
      }
      continue;
    }
    if ('subItems' in item && item.subItems) {
      const allowedValues = getAllowedForModule(item.label);
      if (!allowedValues?.length) continue;
      const allowedSet = new Set(allowedValues.map(normalize));
      const sub = item.subItems.filter(
        (s) =>
          allowedSet.has('*') ||
          allowedSet.has(normalize(s.label)) ||
          allowedSet.has(normalize(s.href))
      );
      if (!sub.length) continue;
      out.push({ ...item, subItems: sub });
    }
  }
  return out;
}
