/**
 * Cargos habituales en el formulario de miembros (referencia; no es lista cerrada en API).
 * La vista «Personal y cargos» usa exclusión por rol, no esta lista.
 */
export const STAFF_DIRECTORY_ROLES = [
  'Pastor',
  'Ayuda Pastoral',
  'Directiva',
  'Presidente',
  'Responsable de una Comisión',
  'Consejo de pastores',
  'Director de Instituto',
  'Pastor Regional',
  'Pastor de Zona',
  'Pastor Presbiterial',
  'Director General',
  'Estudiante del Instituto',
] as const;

/** Patrón (case-insensitive) para `GET /api/members` con `sessionChurchScope` y sin `staffCargoList`. */
export const MEMBERS_DIRECTORY_EXCLUDED_STAFF_ROLES_PATTERN =
  '^(super administrador|administrador general|consejo de pastores|director general)$';

/**
 * Patrón (case-insensitive) para «Personal y cargos» (`staffCargoList=1`) y para
 * exclusiones en `staffDirectoryAllChurches=1` (`/members/staff`): no deben listarse estos roles.
 * Incluye cargos equivalentes a «Administrador general» (`isAdministradorGeneralEquivalentStaffRole`).
 */
export const STAFF_CARGO_DIRECTORY_EXCLUDED_PATTERN =
  '^(super administrador|administrador general|consejo de pastores|director general|nuevo|congregante)$';
