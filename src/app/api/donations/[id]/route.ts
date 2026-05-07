import { NextResponse } from 'next/server';
import { CHURCHES_COLLECTION, type ChurchLocation } from '@/lib/church-locations';
import { mergeDonationIdWithScope, resolveDonationsReadScope } from '@/lib/donations-scope';
import { getDb } from '@/lib/mongodb';
import {
  createDonationSchema,
  type DonationDocument,
} from '../route';

const DONATION_COLLECTION = 'donation';

const normalizeComparable = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

async function resolveId(
  context: { params: Promise<{ id: string }> | { id: string } }
): Promise<string> {
  const raw = context.params;
  const resolved = raw instanceof Promise ? await raw : raw;
  return resolved?.id?.trim() ?? '';
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const id = await resolveId(context);
    if (!id) {
      return NextResponse.json({ error: 'Id inválido.' }, { status: 400 });
    }
    const db = await getDb();
    const scope = await resolveDonationsReadScope(db);
    const donation = await db
      .collection<DonationDocument>(DONATION_COLLECTION)
      .findOne(mergeDonationIdWithScope(id, scope), { projection: { _id: 0 } });

    if (!donation) {
      return NextResponse.json({ error: 'Donación no encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ donation });
  } catch (e) {
    console.error('[api/donations/[id] GET]', e);
    const message =
      e instanceof Error ? e.message : 'Error al leer la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const id = await resolveId(context);
    if (!id) {
      return NextResponse.json({ error: 'Id inválido.' }, { status: 400 });
    }

    const json = await request.json();
    const parsed = createDonationSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const payload = parsed.data;

    const db = await getDb();
    const collection = db.collection<DonationDocument>(DONATION_COLLECTION);
    const scope = await resolveDonationsReadScope(db);
    const existing = await collection.findOne(mergeDonationIdWithScope(id, scope), {
      projection: { _id: 0 },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Donación no encontrada.' }, { status: 404 });
    }

    const church = await db
      .collection<ChurchLocation>(CHURCHES_COLLECTION)
      .findOne({ id: payload.churchId }, { projection: { _id: 0, id: 1, name: 1 } });

    if (!church) {
      return NextResponse.json(
        { error: 'El templo seleccionado no existe. No se puede guardar la donación.' },
        { status: 400 }
      );
    }
    if (normalizeComparable(church.name) !== normalizeComparable(payload.churchName)) {
      return NextResponse.json(
        {
          error:
            'Los datos del templo no coinciden con el registro. Vuelva a cargar la página y seleccione el templo correcto.',
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const doc: DonationDocument = {
      id,
      createdAt: existing.createdAt,
      ...payload,
      notes: payload.notes.trim(),
      transferReference: payload.transferReference.trim(),
      donor: {
        ...payload.donor,
        email: payload.donor.email.trim(),
        phone: payload.donor.phone.trim(),
      },
      attendanceEvent: {
        id: payload.attendanceEvent.id.trim(),
        name: payload.attendanceEvent.name.trim(),
      },
      churchName: church.name,
      updatedAt: now,
    };

    await collection.replaceOne({ id }, doc);

    return NextResponse.json({
      ok: true,
      message: 'Donación actualizada correctamente.',
      donation: doc,
    });
  } catch (e) {
    console.error('[api/donations/[id] PUT]', e);
    const message =
      e instanceof Error ? e.message : 'Error al guardar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
