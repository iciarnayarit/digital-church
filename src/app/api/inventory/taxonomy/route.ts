import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDb } from '@/lib/mongodb';
import {
  CONDITION_META,
  INVENTORY_DOC_TYPE_TAXONOMY,
  INVENTORY_TAXONOMY_DOC_ID,
  type ConditionKey,
  type InventoryTaxonomyDoc,
  type ResourceStatus,
  STATUS_BADGE,
} from '@/lib/inventory';

const COLLECTION = 'inventory';

const BUILTIN_CONDITIONS: ConditionKey[] = ['excellent', 'good', 'repair'];
const BUILTIN_STATUSES: ResourceStatus[] = ['available', 'in_use', 'maintenance'];

function emptyTaxonomy(now: string): InventoryTaxonomyDoc {
  return {
    docType: INVENTORY_DOC_TYPE_TAXONOMY,
    id: INVENTORY_TAXONOMY_DOC_ID,
    conditions: [],
    statuses: [],
    updatedAt: now,
  };
}

export async function GET() {
  try {
    const db = await getDb();
    const doc = await db.collection<InventoryTaxonomyDoc>(COLLECTION).findOne({
      docType: INVENTORY_DOC_TYPE_TAXONOMY,
      id: INVENTORY_TAXONOMY_DOC_ID,
    });
    const customCond = doc?.conditions ?? [];
    const customStat = doc?.statuses ?? [];
    const conditions = [
      ...BUILTIN_CONDITIONS.map((key) => ({
        key,
        label: CONDITION_META[key].label,
        builtin: true as const,
      })),
      ...customCond.map((c) => ({ ...c, builtin: false as const })),
    ];
    const statuses = [
      ...BUILTIN_STATUSES.map((key) => ({
        key,
        label: STATUS_BADGE[key].label,
        builtin: true as const,
      })),
      ...customStat.map((s) => ({ ...s, builtin: false as const })),
    ];
    return NextResponse.json({ conditions, statuses });
  } catch (e) {
    console.error('[api/inventory/taxonomy GET]', e);
    const message = e instanceof Error ? e.message : 'Error al leer la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const kind = body?.kind === 'status' ? 'status' : body?.kind === 'condition' ? 'condition' : null;
    const label = typeof body?.label === 'string' ? body.label.trim() : '';
    if (!kind || !label) {
      return NextResponse.json(
        { error: 'Envíe { "kind": "condition" | "status", "label": "…" }.' },
        { status: 400 }
      );
    }

    const labelLower = label.toLowerCase();
    if (kind === 'condition') {
      const dupBuiltin = BUILTIN_CONDITIONS.some(
        (k) => CONDITION_META[k].label.toLowerCase() === labelLower
      );
      if (dupBuiltin) {
        return NextResponse.json(
          { error: 'Esa condición ya existe en la lista predeterminada.' },
          { status: 400 }
        );
      }
    } else {
      const dupBuiltin = BUILTIN_STATUSES.some(
        (k) => STATUS_BADGE[k].label.toLowerCase() === labelLower
      );
      if (dupBuiltin) {
        return NextResponse.json(
          { error: 'Ese estado ya existe en la lista predeterminada.' },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();
    const prefix = kind === 'condition' ? 'icond' : 'istat';
    const key = `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

    const db = await getDb();
    const coll = db.collection<InventoryTaxonomyDoc>(COLLECTION);
    const existing = await coll.findOne({
      docType: INVENTORY_DOC_TYPE_TAXONOMY,
      id: INVENTORY_TAXONOMY_DOC_ID,
    });
    const base = existing ?? emptyTaxonomy(now);
    const next: InventoryTaxonomyDoc = {
      ...base,
      docType: INVENTORY_DOC_TYPE_TAXONOMY,
      id: INVENTORY_TAXONOMY_DOC_ID,
      conditions: [...(base.conditions ?? [])],
      statuses: [...(base.statuses ?? [])],
      updatedAt: now,
    };
    if (kind === 'condition') {
      const dup = next.conditions.some(
        (c) => c.label.trim().toLowerCase() === label.toLowerCase()
      );
      if (dup) {
        return NextResponse.json({ error: 'Ya existe una condición con ese nombre.' }, { status: 400 });
      }
      next.conditions.push({ key, label });
    } else {
      const dup = next.statuses.some((s) => s.label.trim().toLowerCase() === label.toLowerCase());
      if (dup) {
        return NextResponse.json({ error: 'Ya existe un estado con ese nombre.' }, { status: 400 });
      }
      next.statuses.push({ key, label });
    }

    await coll.replaceOne(
      { docType: INVENTORY_DOC_TYPE_TAXONOMY, id: INVENTORY_TAXONOMY_DOC_ID },
      next,
      { upsert: true }
    );

    return NextResponse.json({ key, label, kind });
  } catch (e) {
    console.error('[api/inventory/taxonomy POST]', e);
    const message = e instanceof Error ? e.message : 'Error al guardar.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type TaxonomyRowInput = { id?: string; name?: string };

function newTaxonomyKey(prefix: 'icond' | 'istat'): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function normalizeKeyForSave(
  rawId: string | undefined,
  prefix: 'icond' | 'istat'
): string {
  const id = String(rawId ?? '').trim();
  const expected = `${prefix}_`;
  if (id.startsWith(expected) && id.length > expected.length) return id;
  return newTaxonomyKey(prefix);
}

/** Reemplaza la lista de condiciones o estados personalizados (mismo patrón que áreas por templo). */
export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const kind = body?.kind === 'status' ? 'status' : body?.kind === 'condition' ? 'condition' : null;
    const rowsRaw = body?.rows;
    if (!kind || !Array.isArray(rowsRaw)) {
      return NextResponse.json(
        { error: 'Envíe { "kind": "condition" | "status", "rows": [{ "id", "name" }] }.' },
        { status: 400 }
      );
    }

    const rows = rowsRaw as TaxonomyRowInput[];
    const labels = rows
      .map((r) => String(r.name ?? '').trim())
      .filter((n) => n.length > 0);

    const seen = new Set<string>();
    for (const label of labels) {
      const low = label.toLowerCase();
      if (seen.has(low)) {
        return NextResponse.json({ error: `Hay nombres duplicados: «${label}».` }, { status: 400 });
      }
      seen.add(low);
    }

    const prefix = kind === 'condition' ? 'icond' : 'istat';
    const builtins =
      kind === 'condition'
        ? BUILTIN_CONDITIONS.map((k) => CONDITION_META[k].label.toLowerCase())
        : BUILTIN_STATUSES.map((k) => STATUS_BADGE[k].label.toLowerCase());

    const nextCustom: { key: string; label: string }[] = [];
    const usedKeys = new Set<string>();
    for (const r of rows) {
      const label = String(r.name ?? '').trim();
      if (!label) continue;
      const low = label.toLowerCase();
      if (builtins.includes(low)) {
        return NextResponse.json(
          {
            error: `«${label}» coincide con una opción ya incluida en el sistema.`,
          },
          { status: 400 }
        );
      }
      let key = normalizeKeyForSave(r.id, prefix);
      while (usedKeys.has(key)) {
        key = newTaxonomyKey(prefix);
      }
      usedKeys.add(key);
      nextCustom.push({ key, label });
    }

    const now = new Date().toISOString();
    const db = await getDb();
    const coll = db.collection<InventoryTaxonomyDoc>(COLLECTION);
    const existing = await coll.findOne({
      docType: INVENTORY_DOC_TYPE_TAXONOMY,
      id: INVENTORY_TAXONOMY_DOC_ID,
    });
    const base = existing ?? emptyTaxonomy(now);
    const next: InventoryTaxonomyDoc = {
      ...base,
      docType: INVENTORY_DOC_TYPE_TAXONOMY,
      id: INVENTORY_TAXONOMY_DOC_ID,
      conditions: kind === 'condition' ? nextCustom : [...(base.conditions ?? [])],
      statuses: kind === 'status' ? nextCustom : [...(base.statuses ?? [])],
      updatedAt: now,
    };

    await coll.replaceOne(
      { docType: INVENTORY_DOC_TYPE_TAXONOMY, id: INVENTORY_TAXONOMY_DOC_ID },
      next,
      { upsert: true }
    );

    return NextResponse.json({ ok: true, kind, count: nextCustom.length });
  } catch (e) {
    console.error('[api/inventory/taxonomy PUT]', e);
    const message = e instanceof Error ? e.message : 'Error al guardar.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
