import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDb } from '@/lib/mongodb';
import { normalizeMemberChurchIds } from '@/lib/member-church-ids';
import { isFullAccessStaffRole, isInventoryGlobalStaffRole } from '@/lib/pastor-church-access';
import { CHURCHES_COLLECTION, type ChurchLocation } from '@/lib/church-locations';
import {
  INVENTORY_CATEGORIES_COLLECTION,
  type InventoryCustomCategoryDoc,
} from '@/lib/inventory-custom-categories';
import {
  INVENTORY_DEFAULT_CATEGORY_LABEL,
  INVENTORY_DEFAULT_CATEGORY_VALUE,
  INVENTORY_DOC_TYPE_CHURCH_AREAS,
  INVENTORY_DOC_TYPE_TAXONOMY,
  INVENTORY_TAXONOMY_DOC_ID,
  type ChurchInventoryAreasDoc,
  type ConditionKey,
  type InventoryDoc,
  type InventoryTaxonomyDoc,
  type ResourceStatus,
  buildResourceRowFromTempleArea,
} from '@/lib/inventory';
import {
  INVENTORY_RESOURCE_COLLECTION,
  RESOURCE_DOC_KIND_SYSTEM_CATEGORY,
  type ResourceSystemCategoryDoc,
} from '@/lib/inventory-resource';

const COLLECTION = 'inventory';

const CONDITIONS: ConditionKey[] = ['excellent', 'good', 'repair'];
const STATUSES: ResourceStatus[] = ['available', 'in_use', 'maintenance'];

const INVENTORY_LIST_FILTER = {
  docType: { $nin: [INVENTORY_DOC_TYPE_CHURCH_AREAS, INVENTORY_DOC_TYPE_TAXONOMY] },
} as const;

async function loadTaxonomy(db: Awaited<ReturnType<typeof getDb>>): Promise<InventoryTaxonomyDoc | null> {
  const doc = await db.collection<InventoryTaxonomyDoc>('inventory').findOne({
    docType: INVENTORY_DOC_TYPE_TAXONOMY,
    id: INVENTORY_TAXONOMY_DOC_ID,
  });
  return doc;
}

function isAllowedConditionKey(
  key: string,
  tax: InventoryTaxonomyDoc | null
): boolean {
  if (CONDITIONS.includes(key as ConditionKey)) return true;
  return (tax?.conditions ?? []).some((c) => c.key === key);
}

function isAllowedStatusKey(key: string, tax: InventoryTaxonomyDoc | null): boolean {
  if (STATUSES.includes(key as ResourceStatus)) return true;
  return (tax?.statuses ?? []).some((s) => s.key === key);
}

function taxonomyConditionLabel(key: string, tax: InventoryTaxonomyDoc | null): string | undefined {
  if (CONDITIONS.includes(key as ConditionKey)) return undefined;
  return tax?.conditions.find((c) => c.key === key)?.label;
}

function taxonomyStatusLabel(key: string, tax: InventoryTaxonomyDoc | null): string | undefined {
  if (STATUSES.includes(key as ResourceStatus)) return undefined;
  return tax?.statuses.find((s) => s.key === key)?.label;
}

export async function GET(request: Request) {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTION);
    let allowedChurchIds: string[] | null = null;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ items: [], lastInventoryActivityAt: null });
    }
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
    if (!email) {
      return NextResponse.json({ items: [], lastInventoryActivityAt: null });
    }
    const sessionMember = await db.collection<Record<string, unknown>>('members').findOne(
      { email },
      { projection: { _id: 0, churchIds: 1, templeIds: 1, staffRole: 1 } }
    );
    if (!sessionMember) {
      return NextResponse.json({ items: [], lastInventoryActivityAt: null });
    }
    if (isInventoryGlobalStaffRole(sessionMember.staffRole as string | null | undefined)) {
      allowedChurchIds = null;
    } else {
      const ids = normalizeMemberChurchIds(sessionMember);
      if (ids.length === 0) {
        return NextResponse.json({ items: [], lastInventoryActivityAt: null });
      }
      allowedChurchIds = ids;
    }

    let raw = await collection.find(INVENTORY_LIST_FILTER).sort({ name: 1 }).toArray();

    if (allowedChurchIds) {
      const allowed = new Set(allowedChurchIds);
      raw = raw.filter((doc) => {
        const cid = typeof (doc as Record<string, unknown>).churchId === 'string'
          ? String((doc as Record<string, unknown>).churchId).trim()
          : '';
        return cid !== '' && allowed.has(cid);
      });
    }

    let lastMs = 0;
    for (const doc of raw) {
      const rec = doc as Record<string, unknown> & { _id?: unknown };
      let ms = 0;
      if (typeof rec.updatedAt === 'string') {
        const t = new Date(rec.updatedAt).getTime();
        if (!Number.isNaN(t)) ms = t;
      }
      if (ms === 0 && rec._id instanceof ObjectId) {
        ms = rec._id.getTimestamp().getTime();
      }
      if (ms > lastMs) lastMs = ms;
    }
    const lastInventoryActivityAt = lastMs > 0 ? new Date(lastMs).toISOString() : null;

    const items = raw.map((doc) => {
      const { _id, ...rest } = doc as Record<string, unknown> & { _id?: unknown };
      return rest;
    }) as InventoryDoc[];

    return NextResponse.json({ items, lastInventoryActivityAt });
  } catch (e) {
    console.error('[api/inventory GET]', e);
    const message =
      e instanceof Error ? e.message : 'Error al leer la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'El nombre del recurso es obligatorio.' }, { status: 400 });
    }

    const rawCategory =
      typeof body.categoryFilter === 'string' ? body.categoryFilter.trim() : '';
    const categoryFilter = rawCategory || INVENTORY_DEFAULT_CATEGORY_VALUE;

    const churchId = typeof body.churchId === 'string' ? body.churchId.trim() : '';
    const areaId = typeof body.areaId === 'string' ? body.areaId.trim() : '';
    if (!churchId || !areaId) {
      return NextResponse.json(
        { error: 'Debe seleccionar templo y ubicación (área).' },
        { status: 400 }
      );
    }

    const quantity = Number(body.quantity);
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
      return NextResponse.json({ error: 'La cantidad debe ser un entero mayor o igual a 0.' }, { status: 400 });
    }

    const condKey = typeof body.condition === 'string' ? body.condition.trim() : '';
    const statKey = typeof body.status === 'string' ? body.status.trim() : '';
    if (!condKey || !statKey) {
      return NextResponse.json({ error: 'Condición y estado son obligatorios.' }, { status: 400 });
    }

    const db = await getDb();
    const taxonomy = await loadTaxonomy(db);
    if (!isAllowedConditionKey(condKey, taxonomy)) {
      return NextResponse.json({ error: 'Condición inválida.' }, { status: 400 });
    }
    if (!isAllowedStatusKey(statKey, taxonomy)) {
      return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
    }

    const conditionDisplayLabel = taxonomyConditionLabel(condKey, taxonomy);
    const statusDisplayLabel = taxonomyStatusLabel(statKey, taxonomy);

    let createdByMemberId: string | undefined;
    const { userId } = await auth();
    if (userId) {
      const user = await currentUser();
      const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
      if (email) {
        const sessionMember = await db
          .collection<Record<string, unknown>>('members')
          .findOne(
            { email },
            { projection: { _id: 0, id: 1, churchIds: 1, templeIds: 1, staffRole: 1 } }
          );
        if (sessionMember) {
          const mid =
            sessionMember.id != null ? String(sessionMember.id).trim() : '';
          if (mid) createdByMemberId = mid;
          if (!isFullAccessStaffRole(sessionMember.staffRole as string | null | undefined)) {
            const allowed = normalizeMemberChurchIds(sessionMember);
            if (allowed.length > 0 && !allowed.includes(churchId)) {
              return NextResponse.json(
                { error: 'No puede registrar inventario en un templo que no tiene asignado.' },
                { status: 403 }
              );
            }
          }
        }
      }
    }

    let categoryDisplayLabel: string | undefined;
    if (categoryFilter === INVENTORY_DEFAULT_CATEGORY_VALUE) {
      categoryDisplayLabel = INVENTORY_DEFAULT_CATEGORY_LABEL;
    } else {
      const resourceCat = await db
        .collection<ResourceSystemCategoryDoc>(INVENTORY_RESOURCE_COLLECTION)
        .findOne(
          { kind: RESOURCE_DOC_KIND_SYSTEM_CATEGORY, value: categoryFilter },
          { projection: { _id: 0, label: 1 } }
        );
      if (resourceCat?.label) {
        categoryDisplayLabel = resourceCat.label;
      } else {
        const customCat = await db
          .collection<InventoryCustomCategoryDoc>(INVENTORY_CATEGORIES_COLLECTION)
          .findOne({ value: categoryFilter }, { projection: { _id: 0, label: 1 } });
        if (!customCat) {
          return NextResponse.json({ error: 'Categoría inválida.' }, { status: 400 });
        }
        categoryDisplayLabel = customCat.label;
      }
    }

    const church = await db
      .collection<ChurchLocation>(CHURCHES_COLLECTION)
      .findOne({ id: churchId }, { projection: { _id: 0, inventoryAreas: 1 } });

    if (!church) {
      return NextResponse.json({ error: 'Templo no encontrado.' }, { status: 404 });
    }

    const invCollection = db.collection<ChurchInventoryAreasDoc | InventoryDoc>(COLLECTION);
    const areasBundle = (await invCollection.findOne(
      { docType: INVENTORY_DOC_TYPE_CHURCH_AREAS, churchId },
      { projection: { _id: 0, areas: 1 } }
    )) as ChurchInventoryAreasDoc | null;

    let areas = areasBundle?.areas ?? [];
    if (areas.length === 0) {
      areas = church.inventoryAreas ?? [];
    }

    const area = areas.find((a) => a.id === areaId);
    if (!area) {
      return NextResponse.json(
        { error: 'El área no existe en este templo o fue eliminada.' },
        { status: 400 }
      );
    }

    const row = buildResourceRowFromTempleArea({
      name,
      categoryFilter,
      categoryDisplayLabel,
      churchId,
      areaId,
      areaName: area.name,
      quantity,
      condition: condKey,
      status: statKey,
      ...(conditionDisplayLabel !== undefined ? { conditionDisplayLabel } : {}),
      ...(statusDisplayLabel !== undefined ? { statusDisplayLabel } : {}),
      ...(createdByMemberId !== undefined ? { createdByMemberId } : {}),
    });

    await invCollection.insertOne(row);

    return NextResponse.json({ item: row }, { status: 201 });
  } catch (e) {
    console.error('[api/inventory POST]', e);
    const message =
      e instanceof Error ? e.message : 'Error al guardar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
