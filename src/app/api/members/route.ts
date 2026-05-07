import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import type { Collection } from 'mongodb';
import { auth, currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';
import { getDb } from '@/lib/mongodb';
import { consumePhotoUpload } from '@/lib/member-photo-upload';
import { mongoOrMemberBelongsToChurch, normalizeMemberChurchIds } from '@/lib/member-church-ids';
import { MINISTRIES_COLLECTION, type MinistryDocument } from '@/lib/ministries';
import {
  isFullAccessStaffRole,
  isLeadershipStaffRole,
  PASTOR_SCOPED_STAFF_ROLE_MONGO_REGEX,
} from '@/lib/pastor-church-access';
import { STAFF_CARGO_DIRECTORY_EXCLUDED_PATTERN } from '@/lib/staff-directory-roles';

export const createMemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.string().min(1),
  dob: z.string().min(1),
  spiritualBirthday: z.string().nullable().optional(),
  groups: z.array(z.string()).default([]),
  /** Ids de documentos en la colección `churches` (y opcionalmente `otro`). */
  churchIds: z.array(z.string()).default([]),
  membershipStatus: z.string().min(1),
  photoDataUrl: z.string().nullable().optional(),
  /** Imagen ya guardada vía POST /api/member-photo-uploads al seleccionar archivo. */
  photoUploadId: z.string().uuid().optional(),
  /**
   * Departamento organizacional (opcional). Ausente o vacío → `null` en Mongo.
   * El alta/edición por UI ya no lo envía; puede seguir existiendo en datos antiguos o vía API.
   */
  department: z.string().max(120).optional(),
  staffRole: z.string().max(200).optional(),
  /** Id del documento en la colección `staff_roles`. */
  portalRoleId: z.string().uuid().nullable().optional(),
  staffRoleGrants: z
    .object({
      roleId: z.string().uuid(),
      name: z.string().min(1),
      description: z.string(),
      modules: z.record(z.array(z.string())),
    })
    .nullable()
    .optional(),
});

export type MemberDocument = {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
  spiritualBirthday: string | null;
  groups: string[];
  /** Referencias a `churches.id` en MongoDB (puede incluir `otro`). */
  churchIds: string[];
  membershipStatus: string;
  photoDataUrl: string | null;
  /** Departamento para directorios filtrados; `null` = sin asignar en el formulario. */
  department: string | null;
  staffRole: string | null;
  portalRoleId?: string | null;
  staffRoleGrants?: {
    roleId: string;
    name: string;
    description: string;
    modules: Record<string, string[]>;
  } | null;
  /** `members.id` del usuario que editó por último (sesión Clerk → email → miembro). */
  updatedByMemberId?: string | null;
};

/** Límite aproximado para evitar superar el tope de 16MB de un documento BSON con foto en base64. */
const MAX_PHOTO_DATA_URL_LENGTH = 12_000_000;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findMemberByEmail(
  members: Collection<MemberDocument>,
  normalizedEmail: string,
  projection: Record<string, 0 | 1>
) {
  const byExact = await members.findOne(
    { email: normalizedEmail },
    { projection }
  );
  if (byExact) return byExact;
  const byCaseInsensitive = await members.findOne(
    { email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' } },
    { projection }
  );
  return byCaseInsensitive;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const exactEmailParam = searchParams.get('exactEmail')?.trim().toLowerCase();
    // Ej. `?department=Pastoral` → solo miembros con ese `department` en el documento.
    const department = searchParams.get('department')?.trim();
    const group = searchParams.get('group')?.trim();
    const q = searchParams.get('q')?.trim();
    /** Ej. `?staffRoles=Admin,Pastor` → solo miembros cuyo `staffRole` coincide (sin distinguir mayúsculas). */
    const staffRolesRaw = searchParams.get('staffRoles')?.trim();
    /**
     * Mismo conjunto que `isPastorScopedRole`: Pastor, «Pastor …», «Ayuda Pastoral».
     * Preferible a listar cada rol en `staffRoles` (p. ej. búsqueda de donante pastoral en donaciones).
     */
    const pastoralStaffRoles =
      searchParams.get('pastoralStaffRoles') === '1' ||
      searchParams.get('pastoralStaffRoles') === 'true';
    const churchIdParam = searchParams.get('churchId')?.trim();
    /** Varias iglesias (coma-separado), p. ej. edición de ministerio con varios `creatorChurchIds`. */
    const churchIdsRaw = searchParams.get('churchIds')?.trim();
    const churchIdsList = churchIdsRaw
      ? [...new Set(churchIdsRaw.split(',').map((s) => s.trim()).filter(Boolean))]
      : [];
    /** Pantalla «Asignar a ministerio»: oculta pastores (rol exacto) que ya están en algún ministerio. */
    const excludePastorsInMinistry =
      searchParams.get('excludePastorsInMinistry') === '1' ||
      searchParams.get('excludePastorsInMinistry') === 'true';
    /** Si está activo, limita resultados a los templos del miembro en sesión. */
    const sessionChurchScope =
      searchParams.get('sessionChurchScope') === '1' ||
      searchParams.get('sessionChurchScope') === 'true';
    /** «Personal y cargos»: cualquier `staffRole` salvo administradores globales, «Nuevo» y «Congregante». */
    const staffCargoList =
      searchParams.get('staffCargoList') === '1' ||
      searchParams.get('staffCargoList') === 'true';
    /**
     * «Personal y cargos» nacional (`/members/staff`): cualquier miembro con `staffRole`, de **todas** las iglesias,
     * excluyendo super admin, admin general, «Nuevo» y «Congregante». Requiere sesión con miembro enlazado.
     */
    const staffDirectoryAllChurches =
      searchParams.get('staffDirectoryAllChurches') === '1' ||
      searchParams.get('staffDirectoryAllChurches') === 'true';
    const limitParam = Number(searchParams.get('limit') ?? '0');
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 0;

    const conditions: Record<string, unknown>[] = [];
    const db = await getDb();

    if (exactEmailParam) {
      const members = db.collection<MemberDocument>('members');
      const existing = await findMemberByEmail(
        members,
        exactEmailParam,
        { _id: 0, id: 1, email: 1 }
      );
      return NextResponse.json({
        exists: Boolean(existing?.id),
        member: existing ?? null,
      });
    }

    if (staffDirectoryAllChurches) {
      const { userId } = await auth();
      const denyStaffDir = () => conditions.push({ id: '__staff_directory_all_churches_empty__' });
      if (!userId) {
        denyStaffDir();
      } else {
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
        if (!email) {
          denyStaffDir();
        } else {
          const linked = await db
            .collection<Record<string, unknown>>('members')
            .findOne({ email }, { projection: { _id: 0, id: 1 } });
          if (!linked) {
            denyStaffDir();
          }
        }
      }
      conditions.push({ staffRole: { $exists: true, $nin: [null, ''] } });
      conditions.push({
        $nor: [
          {
            staffRole: {
              $regex: STAFF_CARGO_DIRECTORY_EXCLUDED_PATTERN,
              $options: 'i',
            },
          },
        ],
      });
    } else if (sessionChurchScope) {
      const { userId } = await auth();
      const denyAll = () => conditions.push({ id: '__session_church_scope_empty__' });

      if (!userId) {
        denyAll();
      } else {
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
        if (!email) {
          denyAll();
        } else {
          const sessionMember = await db
            .collection<Record<string, unknown>>('members')
            .findOne(
              { email },
              { projection: { _id: 0, churchIds: 1, templeIds: 1, staffRole: 1 } }
            );
          if (!sessionMember) {
            denyAll();
          } else if (isFullAccessStaffRole(sessionMember.staffRole as string | null | undefined)) {
            // Sin filtro por templos: acceso completo (p. ej. admin).
          } else {
            const sessionChurchIds = normalizeMemberChurchIds(sessionMember);
            if (sessionChurchIds.length > 0) {
              conditions.push({
                $or: sessionChurchIds.map((cid) => mongoOrMemberBelongsToChurch(cid)),
              });
            } else {
              denyAll();
            }
          }
        }
      }
    }

    if (!staffDirectoryAllChurches && sessionChurchScope) {
      if (staffCargoList) {
        conditions.push({
          staffRole: { $exists: true, $nin: [null, ''] },
        });
        conditions.push({
          $nor: [
            {
              staffRole: {
                $regex: STAFF_CARGO_DIRECTORY_EXCLUDED_PATTERN,
                $options: 'i',
              },
            },
          ],
        });
      } else {
        /** Directorio en `/members`: solo congregantes; el templo ya viene del bloque `sessionChurchScope` (salvo acceso completo). */
        conditions.push({
          staffRole: {
            $regex: '^congregante$',
            $options: 'i',
          },
        });
      }
    }

    if (churchIdsList.length > 0) {
      conditions.push({
        $or: churchIdsList.map((cid) => mongoOrMemberBelongsToChurch(cid)),
      });
    } else if (churchIdParam) {
      conditions.push(mongoOrMemberBelongsToChurch(churchIdParam));
    }

    if (department) {
      conditions.push({ department });
    }
    if (group) {
      conditions.push({ groups: group });
    }
    if (pastoralStaffRoles) {
      conditions.push({
        staffRole: { $regex: PASTOR_SCOPED_STAFF_ROLE_MONGO_REGEX, $options: 'i' },
      });
    } else if (staffRolesRaw) {
      const roles = staffRolesRaw
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      if (roles.length > 0) {
        const pattern = roles
          .map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|');
        conditions.push({
          staffRole: { $regex: `^(${pattern})$`, $options: 'i' },
        });
      }
    }
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const byName = new RegExp(escaped, 'i');
      const compact = q.replace(/\s+/g, '');
      const byFullName = compact ? new RegExp(compact, 'i') : byName;
      conditions.push({
        $or: [
          { firstName: byName },
          { lastName: byName },
          { email: byName },
          { phone: byName },
          {
            $expr: {
              $regexMatch: {
                input: {
                  $replaceAll: {
                    input: { $concat: ['$firstName', '$lastName'] },
                    find: ' ',
                    replacement: '',
                  },
                },
                regex: byFullName.source,
                options: 'i',
              },
            },
          },
        ],
      });
    }

    const filter: Record<string, unknown> =
      conditions.length === 0
        ? {}
        : conditions.length === 1
          ? conditions[0]!
          : { $and: conditions };

    let query = db.collection<MemberDocument>('members').find(filter).sort({ createdAt: -1 });
    if (limit > 0) {
      query = query.limit(limit);
    }
    const docs = await query.toArray();
    let members = docs
      .map((raw) => {
        const rec = raw as Record<string, unknown>;
        const { templeIds: _legacyTemple, _id, ...rest } = rec;
        const appId = typeof rec.id === 'string' ? rec.id.trim() : '';
        const oidStr =
          _id != null && typeof _id === 'object' && 'toString' in _id
            ? String((_id as { toString: () => string }).toString())
            : '';
        const stableId = appId || oidStr;
        return {
          ...rest,
          id: stableId,
          churchIds: normalizeMemberChurchIds(rec as Record<string, unknown>),
        } as MemberDocument;
      })
      .filter((m) => String(m.id ?? '').trim() !== '');

    if (excludePastorsInMinistry && members.length > 0) {
      const ministryDocs = await db
        .collection<Pick<MinistryDocument, 'leaders' | 'memberAssignments'>>(MINISTRIES_COLLECTION)
        .find({}, { projection: { _id: 0, leaders: 1, memberAssignments: 1 } })
        .toArray();
      const memberIdsInAnyMinistry = new Set<string>();
      for (const doc of ministryDocs) {
        for (const leader of doc.leaders ?? []) {
          const id = String(leader.id ?? '').trim();
          if (id) memberIdsInAnyMinistry.add(id);
        }
        for (const a of doc.memberAssignments ?? []) {
          const id = String(a.memberId ?? '').trim();
          if (id) memberIdsInAnyMinistry.add(id);
        }
      }
      members = members.filter(
        (m) =>
          !(
            isLeadershipStaffRole(m.staffRole) &&
            memberIdsInAnyMinistry.has(String(m.id).trim())
          )
      );
    }

    return NextResponse.json({ members });
  } catch (e) {
    console.error('[api/members GET]', e);
    const message =
      e instanceof Error ? e.message : 'Error al leer la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const deleteBodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export async function DELETE(request: Request) {
  try {
    const json = await request.json().catch(() => null);
    const parsed = deleteBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Envíe { "ids": ["id1", ...] } con al menos un id.' },
        { status: 400 }
      );
    }
    const db = await getDb();
    const result = await db.collection('members').deleteMany({
      id: { $in: parsed.data.ids },
    });
    return NextResponse.json({ ok: true, deletedCount: result.deletedCount });
  } catch (e) {
    console.error('[api/members DELETE]', e);
    const message =
      e instanceof Error ? e.message : 'Error al eliminar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = createMemberSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const db = await getDb();
    let photoDataUrl = await consumePhotoUpload(
      db,
      body.photoUploadId,
      body.photoDataUrl ?? null
    );
    if (photoDataUrl && photoDataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
      photoDataUrl = null;
    }

    // Omisión o cadena vacía → `null` en Mongo (equivalente a «Sin asignar» en el UI).
    const department =
      body.department !== undefined && String(body.department).trim() !== ''
        ? String(body.department).trim()
        : null;
    const staffRole =
      body.staffRole !== undefined && String(body.staffRole).trim() !== ''
        ? String(body.staffRole).trim()
        : null;

    const portalRoleId =
      body.portalRoleId !== undefined && body.portalRoleId !== null
        ? String(body.portalRoleId).trim()
        : body.portalRoleId === null
          ? null
          : undefined;

    const normalizedEmail = body.email.trim().toLowerCase();
    const members = db.collection<MemberDocument>('members');
    const existing = await findMemberByEmail(
      members,
      normalizedEmail,
      { _id: 0, id: 1, createdAt: 1 }
    );

    const setPayload: Partial<MemberDocument> = {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: normalizedEmail,
      phone: body.phone.trim(),
      address: body.address.trim(),
      dob: body.dob,
      spiritualBirthday: body.spiritualBirthday ?? null,
      groups: [...body.groups],
      churchIds: [...body.churchIds],
      membershipStatus: body.membershipStatus,
      photoDataUrl,
      department,
      staffRole,
      ...(portalRoleId !== undefined ? { portalRoleId } : {}),
      ...(body.staffRoleGrants !== undefined ? { staffRoleGrants: body.staffRoleGrants } : {}),
    };

    if (existing?.id) {
      return NextResponse.json(
        {
          error: 'Ya existe un miembro con ese correo.',
          exists: true,
          id: existing.id,
        },
        { status: 409 }
      );
    }

    const doc: MemberDocument = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      firstName: setPayload.firstName ?? '',
      lastName: setPayload.lastName ?? '',
      email: setPayload.email ?? '',
      phone: setPayload.phone ?? '',
      address: setPayload.address ?? '',
      dob: setPayload.dob ?? '',
      spiritualBirthday: setPayload.spiritualBirthday ?? null,
      groups: setPayload.groups ?? [],
      churchIds: setPayload.churchIds ?? [],
      membershipStatus: setPayload.membershipStatus ?? 'active',
      photoDataUrl: setPayload.photoDataUrl ?? null,
      department: setPayload.department ?? null,
      staffRole: setPayload.staffRole ?? null,
      ...(portalRoleId !== undefined ? { portalRoleId } : {}),
      ...(body.staffRoleGrants !== undefined ? { staffRoleGrants: body.staffRoleGrants } : {}),
    };

    await members.insertOne(doc);

    return NextResponse.json({
      ok: true,
      id: doc.id,
      message: 'Miembro guardado correctamente.',
    });
  } catch (e) {
    console.error('[api/members POST]', e);
    const maybeMongo = e as { code?: unknown; message?: unknown };
    if (Number(maybeMongo?.code) === 11000) {
      return NextResponse.json(
        {
          error: 'Ya existe un miembro con ese correo.',
          exists: true,
        },
        { status: 409 }
      );
    }
    const message =
      e instanceof Error ? e.message : 'Error al guardar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const json = await request.json();
    const parsed = createMemberSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const db = await getDb();
    let photoDataUrl = await consumePhotoUpload(
      db,
      body.photoUploadId,
      body.photoDataUrl ?? null
    );
    if (photoDataUrl && photoDataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
      photoDataUrl = null;
    }

    const department =
      body.department !== undefined && String(body.department).trim() !== ''
        ? String(body.department).trim()
        : null;
    const staffRole =
      body.staffRole !== undefined && String(body.staffRole).trim() !== ''
        ? String(body.staffRole).trim()
        : null;

    const portalRoleId =
      body.portalRoleId !== undefined && body.portalRoleId !== null
        ? String(body.portalRoleId).trim()
        : body.portalRoleId === null
          ? null
          : undefined;

    const normalizedEmail = body.email.trim().toLowerCase();
    const members = db.collection<MemberDocument>('members');
    const existing = await findMemberByEmail(
      members,
      normalizedEmail,
      { _id: 0, id: 1 }
    );
    if (!existing?.id) {
      return NextResponse.json(
        { error: 'No existe un miembro registrado con ese correo.', exists: false },
        { status: 404 }
      );
    }

    const setPayload: Partial<MemberDocument> = {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: normalizedEmail,
      phone: body.phone.trim(),
      address: body.address.trim(),
      dob: body.dob,
      spiritualBirthday: body.spiritualBirthday ?? null,
      groups: [...body.groups],
      churchIds: [...body.churchIds],
      membershipStatus: body.membershipStatus,
      photoDataUrl,
      department,
      staffRole,
      ...(portalRoleId !== undefined ? { portalRoleId } : {}),
      ...(body.staffRoleGrants !== undefined ? { staffRoleGrants: body.staffRoleGrants } : {}),
    };

    await members.updateOne({ id: existing.id }, { $set: setPayload });
    return NextResponse.json({
      ok: true,
      id: existing.id,
      message: 'Miembro actualizado correctamente.',
    });
  } catch (e) {
    console.error('[api/members PUT]', e);
    const message =
      e instanceof Error ? e.message : 'Error al actualizar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
