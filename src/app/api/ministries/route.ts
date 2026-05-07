import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDb } from '@/lib/mongodb';
import { normalizeMemberChurchIds } from '@/lib/member-church-ids';
import {
  isFullAccessStaffRole,
  isLeadershipStaffRole,
} from '@/lib/pastor-church-access';
import {
  CHURCHES_COLLECTION,
  type ChurchLocation,
} from '@/lib/church-locations';
import {
  MINISTRIES_COLLECTION,
  MINISTRY_CATEGORY_VALUES,
  ensureMinistriesCollection,
  type MinistryDocument,
} from '@/lib/ministries';

const leaderSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
});

const createMinistrySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(8000).default(''),
  category: z.enum(MINISTRY_CATEGORY_VALUES).default('general'),
  leaders: z.array(leaderSchema).default([]),
  /** `churches.id` de un templo asignado al pastor en `members.churchIds`. */
  churchId: z.string().min(1).max(200).optional(),
});

export async function GET(request: Request) {
  try {
    const db = await getDb();
    const catalog =
      new URL(request.url).searchParams.get('catalog') === '1' ||
      new URL(request.url).searchParams.get('catalog') === 'true';

    let mongoFilter: Record<string, unknown> = {};
    if (!catalog) {
      const { userId } = await auth();
      if (userId) {
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
        if (!email) {
          return NextResponse.json({ ministries: [] });
        }
        const member = await db.collection<Record<string, unknown>>('members').findOne(
          { email },
          { projection: { _id: 0, staffRole: 1, churchIds: 1, templeIds: 1 } }
        );
        if (isFullAccessStaffRole(member?.staffRole as string | null | undefined)) {
          mongoFilter = {};
        } else {
          const churchIds = normalizeMemberChurchIds(member ?? {});
          if (churchIds.length === 0) {
            return NextResponse.json({ ministries: [] });
          }
          mongoFilter = {
            $or: [
              { churchId: { $in: churchIds } },
              { creatorChurchIds: { $in: churchIds } },
            ],
          };
        }
      }
    }

    const projection = catalog ? { _id: 0, id: 1, name: 1 } : { _id: 0 };

    const docs = await db
      .collection<MinistryDocument>(MINISTRIES_COLLECTION)
      .find(mongoFilter, { projection })
      .sort({ name: 1 })
      .toArray();
    return NextResponse.json({ ministries: docs });
  } catch (e) {
    console.error('[api/ministries GET]', e);
    const message =
      e instanceof Error ? e.message : 'Error al leer la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = createMinistrySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;
    let leaders = body.leaders.map((l) => ({
      id: String(l.id),
      name: l.name.trim(),
      email: l.email.trim().toLowerCase(),
    }));

    const db = await getDb();
    await ensureMinistriesCollection(db);

    const churchIdRaw = body.churchId?.trim() ?? '';

    type MemberCreatorDoc = Record<string, unknown> & {
      id?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      staffRole?: string | null;
    };

    let createdByMemberId: string | undefined;
    let creatorChurchIds: string[] | undefined;
    let sessionMember: MemberCreatorDoc | null = null;

    const { userId } = await auth();
    if (userId) {
      const user = await currentUser();
      const clerkEmail =
        user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
      if (clerkEmail) {
        const member = await db.collection<MemberCreatorDoc>('members').findOne(
          { email: clerkEmail },
          {
            projection: {
              _id: 0,
              id: 1,
              firstName: 1,
              lastName: 1,
              email: 1,
              staffRole: 1,
              churchIds: 1,
              templeIds: 1,
            },
          }
        );
        if (member?.id) {
          sessionMember = member;
          createdByMemberId = String(member.id).trim();
          const churchIdsNorm = normalizeMemberChurchIds(member);
          if (churchIdsNorm.length > 0) {
            creatorChurchIds = churchIdsNorm;
          }

          if (leaders.length === 0 && isLeadershipStaffRole(member.staffRole)) {
            const displayName =
              `${String(member.firstName ?? '').trim()} ${String(member.lastName ?? '').trim()}`.trim() ||
              'Líder';
            const leaderEmail = String(member.email ?? clerkEmail)
              .trim()
              .toLowerCase();
            leaders = [
              {
                id: createdByMemberId,
                name: displayName,
                email: leaderEmail,
              },
            ];
          }
        }
      }
    }

    let churchIdSaved: string | undefined;
    if (churchIdRaw) {
      if (!sessionMember?.id) {
        return NextResponse.json(
          { error: 'Debe iniciar sesión con un perfil de miembro para vincular un templo.' },
          { status: 400 }
        );
      }
      if (!isLeadershipStaffRole(sessionMember.staffRole)) {
        return NextResponse.json(
          {
            error:
              'Solo personal pastoral o de dirección puede vincular un templo al ministerio.',
          },
          { status: 400 }
        );
      }
      const allowedChurchIds = new Set(normalizeMemberChurchIds(sessionMember));
      if (!allowedChurchIds.has(churchIdRaw)) {
        return NextResponse.json(
          { error: 'Ese templo no está asignado a su perfil.' },
          { status: 400 }
        );
      }
      const church = await db
        .collection<ChurchLocation>(CHURCHES_COLLECTION)
        .findOne({ id: churchIdRaw }, { projection: { _id: 0, id: 1 } });
      if (!church) {
        return NextResponse.json({ error: 'El templo indicado no existe.' }, { status: 400 });
      }
      churchIdSaved = church.id;
    }

    const memberCount = leaders.length;
    const doc: MinistryDocument = {
      id: randomUUID(),
      name: body.name.trim(),
      description: body.description.trim(),
      category: body.category,
      leaders,
      memberCount,
      createdAt: new Date().toISOString(),
      ...(createdByMemberId ? { createdByMemberId } : {}),
      ...(creatorChurchIds ? { creatorChurchIds } : {}),
      ...(churchIdSaved ? { churchId: churchIdSaved } : {}),
    };
    await db.collection<MinistryDocument>(MINISTRIES_COLLECTION).insertOne(doc);
    return NextResponse.json(
      { ok: true, id: doc.id, message: 'Ministerio creado correctamente.' },
      { status: 201 }
    );
  } catch (e) {
    console.error('[api/ministries POST]', e);
    const message =
      e instanceof Error ? e.message : 'Error al guardar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
