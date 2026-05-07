import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDb } from '@/lib/mongodb';
import { resolvePastorChurchAccess } from '@/lib/pastor-church-access';
import type { IciarTempleSchedule } from '@/lib/iciar-temples';
import {
  CHURCHES_COLLECTION,
  type ChurchInventoryArea,
  type ChurchLocation,
} from '@/lib/church-locations';

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(String(value).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseSchedulePayload(raw: unknown): IciarTempleSchedule[] | null {
  if (!Array.isArray(raw)) return null;
  const out: IciarTempleSchedule[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    out.push({
      day: typeof r.day === 'string' ? r.day : '',
      time: typeof r.time === 'string' ? r.time : '',
      label: typeof r.label === 'string' ? r.label : '',
    });
  }
  return out;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Id inválido.' }, { status: 400 });
    }
    const trimmedId = id.trim();
    const db = await getDb();

    const doc = await db
      .collection<ChurchLocation>(CHURCHES_COLLECTION)
      .findOne({ id: trimmedId }, { projection: { _id: 0 } });
    if (!doc) {
      return NextResponse.json({ error: 'Ubicación no encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ church: doc });
  } catch (e) {
    console.error('[api/churches/[id] GET]', e);
    const message =
      e instanceof Error ? e.message : 'Error al leer la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const trimmed = id?.trim() ?? '';
    if (!trimmed) {
      return NextResponse.json({ error: 'Id inválido.' }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
    }

    const db = await getDb();

    const { userId: patchUserId } = await auth();
    if (patchUserId) {
      const user = await currentUser();
      const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
      const access = await resolvePastorChurchAccess(db, email);
      if (access.mode === 'none') {
        return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
      }
      if (access.mode === 'subset' && !access.ids.includes(trimmed)) {
        return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'inventoryAreas')) {
      if (!Array.isArray(body.inventoryAreas)) {
        return NextResponse.json(
          { error: 'inventoryAreas debe ser un arreglo.' },
          { status: 400 }
        );
      }

      const cleaned: ChurchInventoryArea[] = [];
      for (const raw of body.inventoryAreas) {
        if (!raw || typeof raw !== 'object') continue;
        const r = raw as Record<string, unknown>;
        const name = typeof r.name === 'string' ? r.name.trim() : '';
        if (!name) continue;
        const aid =
          typeof r.id === 'string' && r.id.trim() ? r.id.trim() : randomUUID();
        cleaned.push({ id: aid, name });
      }

      const invResult = await db.collection<ChurchLocation>(CHURCHES_COLLECTION).updateOne(
        { id: trimmed },
        { $set: { inventoryAreas: cleaned } }
      );

      if (invResult.matchedCount === 0) {
        return NextResponse.json({ error: 'Ubicación no encontrada.' }, { status: 404 });
      }

      const doc = await db
        .collection<ChurchLocation>(CHURCHES_COLLECTION)
        .findOne({ id: trimmed }, { projection: { _id: 0 } });

      return NextResponse.json({ church: doc });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'El nombre del templo es obligatorio.' }, { status: 400 });
    }

    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const municipality = typeof body.municipality === 'string' ? body.municipality.trim() : '';
    const embedUrl = typeof body.embedUrl === 'string' ? body.embedUrl : '';
    const shareMapUrl = typeof body.shareMapUrl === 'string' ? body.shareMapUrl : '';

    const lat = parseFiniteNumber(body.lat);
    const lng = parseFiniteNumber(body.lng);
    if (lat === null) {
      return NextResponse.json({ error: 'Latitud inválida.' }, { status: 400 });
    }
    if (lng === null) {
      return NextResponse.json({ error: 'Longitud inválida.' }, { status: 400 });
    }

    const schedule = parseSchedulePayload(body.schedule);
    if (schedule === null) {
      return NextResponse.json({ error: 'Horarios inválidos.' }, { status: 400 });
    }

    const result = await db.collection<ChurchLocation>(CHURCHES_COLLECTION).updateOne(
      { id: trimmed },
      {
        $set: {
          name,
          address,
          municipality,
          lat,
          lng,
          embedUrl,
          shareMapUrl,
          schedule,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Ubicación no encontrada.' }, { status: 404 });
    }

    const doc = await db
      .collection<ChurchLocation>(CHURCHES_COLLECTION)
      .findOne({ id: trimmed }, { projection: { _id: 0 } });

    return NextResponse.json({ church: doc });
  } catch (e) {
    console.error('[api/churches/[id] PATCH]', e);
    const message =
      e instanceof Error ? e.message : 'Error al guardar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Id inválido.' }, { status: 400 });
    }
    const db = await getDb();
    const trimmed = id.trim();

    const { userId: delUserId } = await auth();
    if (delUserId) {
      const user = await currentUser();
      const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
      const access = await resolvePastorChurchAccess(db, email);
      if (access.mode === 'none') {
        return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
      }
      if (access.mode === 'subset' && !access.ids.includes(trimmed)) {
        return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
      }
    }

    const result = await db.collection(CHURCHES_COLLECTION).deleteOne({
      id: trimmed,
    });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Ubicación no encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: 'Ubicación eliminada.' });
  } catch (e) {
    console.error('[api/churches/[id] DELETE]', e);
    const message =
      e instanceof Error ? e.message : 'Error al eliminar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
