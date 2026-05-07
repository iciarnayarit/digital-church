/**
 * Antes los miembros usaban `templeIds` con índices "1"…"n" (ICIAR_TEMPLES) y "otro".
 * Ahora el vínculo oficial es `churchIds` (ids de la colección `churches` en MongoDB).
 */

export const LEGACY_TEMPLE_INDEX_TO_CHURCH_ID: Record<string, string> = {
  '1': 'templo-la-nueva-jerusalen',
  '2': 'templo-getsemani',
  '3': 'templo-el-limon',
  '4': 'mision-aguamilpa',
  '5': 'mision-el-naranjo',
};

/** Convierte ids antiguos ("1", "otro") a ids de `churches`; deja pasar ids ya válidos. */
export function normalizeMemberChurchIds(raw: Record<string, unknown>): string[] {
  const church = raw.churchIds;
  if (typeof church === 'string' && church.trim()) {
    return [church.trim()];
  }
  if (Array.isArray(church) && church.length > 0) {
    return church
      .map((x) => {
        if (typeof x === 'string') return x.trim();
        if (x && typeof x === 'object' && 'id' in x && typeof (x as { id: unknown }).id === 'string') {
          return String((x as { id: string }).id).trim();
        }
        return String(x).trim();
      })
      .filter(Boolean);
  }
  const legacy = raw.templeIds;
  if (!Array.isArray(legacy) || legacy.length === 0) return [];
  const out: string[] = [];
  for (const id of legacy.map(String)) {
    if (id === 'otro') {
      if (!out.includes('otro')) out.push('otro');
      continue;
    }
    const mapped = LEGACY_TEMPLE_INDEX_TO_CHURCH_ID[id];
    if (mapped && !out.includes(mapped)) out.push(mapped);
    else if (!mapped && id && !out.includes(id)) out.push(id);
  }
  return out;
}

/** Índices legacy (`templeIds`) que corresponden a un `churches.id` concreto. */
export function legacyTempleIndicesForChurchId(churchId: string): string[] {
  const id = churchId.trim();
  if (!id) return [];
  return Object.entries(LEGACY_TEMPLE_INDEX_TO_CHURCH_ID)
    .filter(([, mapped]) => mapped === id)
    .map(([idx]) => idx);
}

/**
 * Condición Mongo para miembros vinculados a un templo (`churchIds` o `templeIds` legacy).
 * Solo usar con `churchId` no vacío.
 */
export function mongoOrMemberBelongsToChurch(churchId: string): Record<string, unknown> {
  const trimmed = churchId.trim();
  const legacyIdx = legacyTempleIndicesForChurchId(trimmed);
  const or: Record<string, unknown>[] = [{ churchIds: trimmed }];
  if (legacyIdx.length > 0) {
    or.push({ templeIds: { $in: legacyIdx } });
  }
  if (trimmed === 'otro') {
    or.push({ templeIds: 'otro' });
  }
  return { $or: or };
}
