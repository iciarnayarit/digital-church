import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { CHURCHES_COLLECTION, type ChurchLocation } from '@/lib/church-locations';
import { getDb } from '@/lib/mongodb';
import { resolveDonationsReadScope } from '@/lib/donations-scope';
import { createDonationSchema, type DonationDocument } from '@/lib/donation-schema';

const DONATION_COLLECTION = 'donation';

const normalizeComparable = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export type { DonationDocument };

export async function GET() {
  try {
    const db = await getDb();
    const scope = await resolveDonationsReadScope(db);

    let filter: Record<string, unknown> = {};
    if (scope.kind === 'open') {
      filter = {};
    } else if (scope.kind === 'none') {
      filter = { churchId: '__no_church_access__' };
    } else {
      filter = scope.filter;
    }

    const donations = await db
      .collection<DonationDocument>(DONATION_COLLECTION)
      .find(filter, { projection: { _id: 0 } })
      .sort({ donationDate: -1, createdAt: -1 })
      .toArray();

    return NextResponse.json({ donations });
  } catch (e) {
    console.error('[api/donations GET]', e);
    const message =
      e instanceof Error ? e.message : 'Error al leer la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
      id: randomUUID(),
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
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<DonationDocument>(DONATION_COLLECTION).insertOne(doc);

    return NextResponse.json(
      {
        ok: true,
        message: 'Donación guardada correctamente.',
        donation: doc,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('[api/donations POST]', e);
    const message =
      e instanceof Error ? e.message : 'Error al guardar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
