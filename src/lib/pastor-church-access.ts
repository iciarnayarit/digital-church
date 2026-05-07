import type { Db } from 'mongodb';
import { normalizeMemberChurchIds } from '@/lib/member-church-ids';

type MemberPastorDoc = Record<string, unknown> & {
  staffRole?: string | null;
  churchIds?: string[];
  templeIds?: string[];
};

/** Solo el rol literal «Pastor» (no Pastor Regional, etc.), p. ej. al crear templos o filtrar ministerios. */
export function isExactPastorStaffRole(staffRole: string | null | undefined): boolean {
  return String(staffRole ?? '')
    .trim()
    .toLowerCase() === 'pastor';
}

/**
 * Cargos con el mismo alcance pastoral que «Pastor» (templos en `churchIds` / `resolvePastorChurchAccess`, etc.).
 * Incluye «Ayuda Pastoral» y variantes «Pastor …» (Regional, de Zona, Presbiterial, …).
 */
const PASTOR_SCOPED_EQUIVALENT_EXACT = new Set(['ayuda pastoral']);

export function isPastorScopedRole(staffRole: string | null | undefined): boolean {
  const r = String(staffRole ?? '')
    .trim()
    .toLowerCase();
  if (!r) return false;
  if (r === 'pastor') return true;
  if (r.startsWith('pastor ')) return true;
  if (PASTOR_SCOPED_EQUIVALENT_EXACT.has(r)) return true;
  return false;
}

/**
 * Mismo criterio que `isPastorScopedRole`, para `$regex` en MongoDB (`$options: 'i'`).
 * Pastor titular, «Pastor …», «Ayuda Pastoral».
 */
export const PASTOR_SCOPED_STAFF_ROLE_MONGO_REGEX = '^(pastor($|\\s.+)|ayuda pastoral)$';

/**
 * Mismos permisos que «Directiva» vía `isLeadershipStaffRole` (presidente, responsable de comisión, director de instituto).
 * Incluye la variante sin «una» usada en datos antiguos / formulario de edición.
 * No incluye «Consejo de pastores» (ese cargo tiene además equivalencia con administrador general).
 */
export const DIRECTIVA_EQUIVALENT_LEADERSHIP_ROLES_LOWER = [
  'directiva',
  'presidente',
  'responsable de una comisión',
  'responsable de comisión',
  'director de instituto',
] as const;

/** Subconjunto: mesa directiva (solo directiva y presidente). */
export const BOARD_LEADERSHIP_STAFF_ROLES_LOWER = ['directiva', 'presidente'] as const;

const DIRECTIVA_EQUIVALENT_LEADERSHIP_SET = new Set<string>(
  DIRECTIVA_EQUIVALENT_LEADERSHIP_ROLES_LOWER
);

const LEADERSHIP_STAFF_ROLES_EXACT = new Set<string>([
  ...DIRECTIVA_EQUIVALENT_LEADERSHIP_ROLES_LOWER,
  'consejo de pastores',
]);

const BOARD_LEADERSHIP_STAFF_ROLES_SET = new Set<string>(BOARD_LEADERSHIP_STAFF_ROLES_LOWER);

/** `true` para cargos con el mismo alcance que Directiva (ver `DIRECTIVA_EQUIVALENT_LEADERSHIP_ROLES_LOWER`). */
export function isDirectivaEquivalentLeadershipStaffRole(
  staffRole: string | null | undefined
): boolean {
  const r = String(staffRole ?? '').trim().toLowerCase();
  return DIRECTIVA_EQUIVALENT_LEADERSHIP_SET.has(r);
}

/** `true` solo para Directiva o Presidente (ver `BOARD_LEADERSHIP_STAFF_ROLES_LOWER`). */
export function isBoardLeadershipStaffRole(staffRole: string | null | undefined): boolean {
  const r = String(staffRole ?? '').trim().toLowerCase();
  return BOARD_LEADERSHIP_STAFF_ROLES_SET.has(r);
}

/**
 * Pastor titular, variantes «Pastor …» (Regional, Zona, Presbiterial, etc.) y cargos de dirección
 * que comparten reglas de templos, ministerios y botones del portal con el rol «Pastor».
 */
export function isLeadershipStaffRole(staffRole: string | null | undefined): boolean {
  if (isPastorScopedRole(staffRole)) return true;
  const r = String(staffRole ?? '').trim().toLowerCase();
  return LEADERSHIP_STAFF_ROLES_EXACT.has(r);
}

/**
 * Roles que comparten el flujo de «registrar datos» del portal (`/members/new`, `isNew` en me-role, etiqueta «Mis datos»).
 */
export function isOnboardingStaffRole(staffRole: string | null | undefined): boolean {
  const r = String(staffRole ?? '').trim().toLowerCase();
  return r === 'nuevo' || r === 'estudiante del instituto';
}

/**
 * Mismo nivel operativo que «Administrador general» (acceso de portal completo vía `isFullAccessStaffRole`,
 * inventario nacional vía `isInventoryGlobalStaffRole`, etc.). Textos en minúsculas = `members.staffRole` normalizado.
 */
const ADMIN_GENERAL_EQUIVALENT_ROLES_LOWER = new Set([
  'administrador general',
  'consejo de pastores',
  'director general',
]);

export function isAdministradorGeneralEquivalentStaffRole(
  staffRole: string | null | undefined
): boolean {
  const r = String(staffRole ?? '').trim().toLowerCase();
  return ADMIN_GENERAL_EQUIVALENT_ROLES_LOWER.has(r);
}

/** Mismo privilegio de alcance que `admin`: sin filtrar por templos asignados ni flujos restrictivos del portal. */
export function isFullAccessStaffRole(staffRole: string | null | undefined): boolean {
  const r = String(staffRole ?? '').trim().toLowerCase();
  if (!r) return false;
  return (
    r === 'admin' ||
    r === 'super administrador' ||
    isAdministradorGeneralEquivalentStaffRole(staffRole)
  );
}

/**
 * Listado de inventario a nivel nacional: super admin, administrador general y cargos equivalentes a este último.
 * El resto de usuarios (incl. `admin` y roles con permisos amplios en otras pantallas) queda acotado a `churchIds`.
 */
export function isInventoryGlobalStaffRole(staffRole: string | null | undefined): boolean {
  const r = String(staffRole ?? '').trim().toLowerCase();
  return r === 'super administrador' || isAdministradorGeneralEquivalentStaffRole(staffRole);
}

export type PastorChurchAccess =
  | { mode: 'all' }
  | { mode: 'none' }
  | { mode: 'subset'; ids: string[] };

/**
 * Resuelve si el miembro autenticado (por email) debe ver solo ciertos templos.
 * `all` = sin restricción (no es pastor con alcance restringido o sin miembro).
 * `none` = pastor sin templos asignados.
 * `subset` = lista de ids de `churches` permitidos.
 */
export async function resolvePastorChurchAccess(
  db: Db,
  email: string | null | undefined
): Promise<PastorChurchAccess> {
  const normalized = String(email ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    return { mode: 'all' };
  }

  const member = await db.collection<MemberPastorDoc>('members').findOne(
    { email: normalized },
    { projection: { _id: 0, staffRole: 1, churchIds: 1, templeIds: 1 } }
  );

  if (member && isFullAccessStaffRole(member.staffRole)) {
    return { mode: 'all' };
  }

  if (!member || !isLeadershipStaffRole(member.staffRole)) {
    return { mode: 'all' };
  }

  /** Ids de templos: prioridad `churchIds`, con respaldo del legado `templeIds` (mismo criterio que el resto del portal). */
  const ids = normalizeMemberChurchIds(member);

  if (ids.length === 0) {
    return { mode: 'none' };
  }

  return { mode: 'subset', ids };
}
