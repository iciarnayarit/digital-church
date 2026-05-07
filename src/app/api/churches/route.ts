import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDb } from '@/lib/mongodb';
import { normalizeMemberChurchIds } from '@/lib/member-church-ids';
import { isFullAccessStaffRole, isLeadershipStaffRole } from '@/lib/pastor-church-access';
import {
  buildMapsUrlsFromAddress,
  CHURCHES_COLLECTION,
  dedupeChurchesById,
  type ChurchLocation,
} from '@/lib/church-locations';

export async function GET(request: Request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const sessionChurchScope =
      searchParams.get('sessionChurchScope') === '1' ||
      searchParams.get('sessionChurchScope') === 'true';

    let mongoFilter: Record<string, unknown> = {};

    if (sessionChurchScope) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ churches: [] });
      }
      const user = await currentUser();
      const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
      if (!email) {
        return NextResponse.json({ churches: [] });
      }
      const sessionMember = await db
        .collection<Record<string, unknown>>('members')
        .findOne(
          { email },
          { projection: { _id: 0, churchIds: 1, templeIds: 1, staffRole: 1 } }
        );
      if (!sessionMember) {
        return NextResponse.json({ churches: [] });
      }
      if (isFullAccessStaffRole(sessionMember.staffRole as string | null | undefined)) {
        mongoFilter = {};
      } else {
        const ids = normalizeMemberChurchIds(sessionMember);
        if (ids.length === 0) {
          return NextResponse.json({ churches: [] });
        }
        mongoFilter = { id: { $in: ids } };
      }
    }

    const docs = await db
      .collection<ChurchLocation>(CHURCHES_COLLECTION)
      .find(mongoFilter, { projection: { _id: 0 } })
      .sort({ name: 1 })
      .toArray();
    return NextResponse.json({ churches: dedupeChurchesById(docs) });
  } catch (e) {
    console.error('[api/churches GET]', e);
    const message =
      e instanceof Error ? e.message : 'Error al leer la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const createChurchFromFormSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(120),
  zip: z.string().min(1).max(32),
  country: z.enum(['usa', 'canada', 'mexico']),
  phone: z.string().max(120).optional().default(''),
  campusPastor: z.string().min(1).max(200),
  contactEmail: z.union([z.literal(''), z.string().email()]).default(''),
  description: z.string().min(1).max(8000),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = createChurchFromFormSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;
    const maps = buildMapsUrlsFromAddress({
      address: body.address.trim(),
      city: body.city.trim(),
      state: body.state.trim(),
      zip: body.zip.trim(),
      country: body.country,
    });
    const db = await getDb();

    type MemberCreatorDoc = { id?: string; staffRole?: string | null };
    const { userId } = await auth();
    let createdByMemberId: string | undefined;
    if (userId) {
      const user = await currentUser();
      const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
      if (email) {
        const member = await db.collection<MemberCreatorDoc>('members').findOne(
          { email },
          { projection: { _id: 0, id: 1, staffRole: 1 } }
        );
        if (
          member?.id &&
          (isFullAccessStaffRole(member.staffRole) ||
            isLeadershipStaffRole(member.staffRole))
        ) {
          createdByMemberId = String(member.id).trim();
        }
      }
    }

    const doc: ChurchLocation = {
      id: randomUUID(),
      name: body.name.trim(),
      address: body.address.trim(),
      municipality: body.city.trim(),
      country: body.country,
      lat: 0,
      lng: 0,
      embedUrl: maps.embedUrl,
      shareMapUrl: maps.shareMapUrl,
      phone: (body.phone ?? '').trim(),
      schedule: [],
      createdAt: new Date().toISOString(),
      city: body.city.trim(),
      state: body.state.trim(),
      zip: body.zip.trim(),
      campusPastor: body.campusPastor.trim(),
      contactEmail: body.contactEmail.trim(),
      description: body.description.trim(),
      ...(createdByMemberId ? { createdByMemberId } : {}),
    };
    await db.collection<ChurchLocation>(CHURCHES_COLLECTION).insertOne(doc);

    if (createdByMemberId) {
      await db.collection('members').updateOne(
        { id: createdByMemberId },
        { $addToSet: { churchIds: doc.id } }
      );
    }
    return NextResponse.json(
      { ok: true, id: doc.id, message: 'Ubicación guardada correctamente.' },
      { status: 201 }
    );
  } catch (e) {
    console.error('[api/churches POST]', e);
    const message =
      e instanceof Error ? e.message : 'Error al guardar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
