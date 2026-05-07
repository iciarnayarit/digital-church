import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDb } from '@/lib/mongodb';
import { consumePhotoUpload } from '@/lib/member-photo-upload';
import { createMemberSchema, type MemberDocument } from '../route';
import { normalizeMemberChurchIds } from '@/lib/member-church-ids';
import {
  isFullAccessStaffRole,
  isLeadershipStaffRole,
  isPastorScopedRole,
} from '@/lib/pastor-church-access';
import { STAFF_CARGO_DIRECTORY_EXCLUDED_PATTERN } from '@/lib/staff-directory-roles';

const MAX_PHOTO_DATA_URL_LENGTH = 12_000_000;

function normalizeDoc(raw: Record<string, unknown> | null): MemberDocument | null {
  if (!raw) return null;
  const idFromField = typeof raw.id === 'string' ? raw.id.trim() : '';
  const idFromOid =
    raw._id != null && typeof raw._id === 'object' && 'toString' in raw._id
      ? String((raw._id as { toString: () => string }).toString())
      : '';
  const stableId = idFromField || idFromOid;
  if (!stableId) return null;
  return {
    id: stableId,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    firstName: typeof raw.firstName === 'string' ? raw.firstName : '',
    lastName: typeof raw.lastName === 'string' ? raw.lastName : '',
    email: typeof raw.email === 'string' ? raw.email : '',
    phone: typeof raw.phone === 'string' ? raw.phone : '',
    address: typeof raw.address === 'string' ? raw.address : '',
    dob:
      raw.dob instanceof Date
        ? raw.dob.toISOString()
        : typeof raw.dob === 'string'
          ? raw.dob
          : new Date(0).toISOString(),
    spiritualBirthday:
      raw.spiritualBirthday === null || raw.spiritualBirthday === undefined
        ? null
        : raw.spiritualBirthday instanceof Date
          ? raw.spiritualBirthday.toISOString()
          : typeof raw.spiritualBirthday === 'string'
            ? raw.spiritualBirthday
            : null,
    groups: Array.isArray(raw.groups) ? raw.groups.map(String) : [],
    churchIds: normalizeMemberChurchIds(raw),
    membershipStatus:
      typeof raw.membershipStatus === 'string' ? raw.membershipStatus : 'active',
    photoDataUrl:
      raw.photoDataUrl === null || raw.photoDataUrl === undefined
        ? null
        : typeof raw.photoDataUrl === 'string'
          ? raw.photoDataUrl
          : null,
    // Campo opcional; puede quedar en BD aunque el formulario ya no lo edite.
    department:
      raw.department === null || raw.department === undefined
        ? null
        : String(raw.department).trim() || null,
    staffRole:
      raw.staffRole === null || raw.staffRole === undefined
        ? null
        : String(raw.staffRole).trim() || null,
    portalRoleId:
      raw.portalRoleId === null || raw.portalRoleId === undefined
        ? null
        : String(raw.portalRoleId).trim() || null,
    updatedByMemberId:
      raw.updatedByMemberId === null || raw.updatedByMemberId === undefined
        ? null
        : String(raw.updatedByMemberId).trim() || null,
    staffRoleGrants:
      raw.staffRoleGrants &&
      typeof raw.staffRoleGrants === 'object' &&
      !Array.isArray(raw.staffRoleGrants)
        ? (raw.staffRoleGrants as MemberDocument['staffRoleGrants'])
        : null,
  };
}

/** Mismo criterio que `staffDirectoryAllChurches` en Pastoral: con `staffRole` y sin los cuatro excluidos. */
function isStaffDirectoryListedMember(staffRole: string | null): boolean {
  if (staffRole == null || !String(staffRole).trim()) return false;
  const re = new RegExp(STAFF_CARGO_DIRECTORY_EXCLUDED_PATTERN, 'i');
  return !re.test(String(staffRole).trim());
}

function sharesTempleWithViewer(
  viewerRaw: Record<string, unknown> | null,
  targetChurchIds: string[]
): boolean {
  if (!viewerRaw || targetChurchIds.length === 0) return false;
  const v = new Set(normalizeMemberChurchIds(viewerRaw));
  if (v.size === 0) return false;
  return targetChurchIds.some((cid) => v.has(cid));
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

    const db = await getDb();
    const members = db.collection('members');
    const normalizedId = id.trim();

    let raw = await members.findOne({ id: normalizedId });
    if (!raw && ObjectId.isValid(normalizedId)) {
      raw = await members.findOne({ _id: new ObjectId(normalizedId) });
    }

    const rawPlain = raw as Record<string, unknown> | null;
    const doc = normalizeDoc(rawPlain);
    if (!doc) {
      return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    if (isStaffDirectoryListedMember(doc.staffRole)) {
      return NextResponse.json({ member: doc });
    }

    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
    const viewerRaw = email
      ? ((await members.findOne(
          { email },
          { projection: { _id: 0, id: 1, staffRole: 1, churchIds: 1, templeIds: 1 } }
        )) as Record<string, unknown> | null)
      : null;

    const viewerStaff = viewerRaw?.staffRole as string | null | undefined;
    if (isFullAccessStaffRole(viewerStaff)) {
      return NextResponse.json({ member: doc });
    }

    if (!viewerRaw) {
      return NextResponse.json(
        { error: 'No tiene permiso para ver este perfil.' },
        { status: 403 }
      );
    }

    const viewerId = String(viewerRaw.id ?? '').trim();
    if (viewerId && viewerId === doc.id) {
      return NextResponse.json({ member: doc });
    }

    if (sharesTempleWithViewer(viewerRaw, doc.churchIds)) {
      return NextResponse.json({ member: doc });
    }

    /** Directorio pastoral: cargos de dirección/pastoral pueden ver perfiles de pastores de otras iglesias. */
    if (
      isPastorScopedRole(doc.staffRole) &&
      isLeadershipStaffRole(viewerStaff)
    ) {
      return NextResponse.json({ member: doc });
    }

    return NextResponse.json(
      { error: 'No tiene permiso para ver este perfil.' },
      { status: 403 }
    );
  } catch (e) {
    console.error('[api/members/[id] GET]', e);
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
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Id inválido.' }, { status: 400 });
    }

    const json = (await request.json()) as Record<string, unknown>;
    const parsed = createMemberSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const db = await getDb();

    let updatedByMemberId: string | undefined;
    const { userId } = await auth();
    if (userId) {
      const user = await currentUser();
      const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
      if (email) {
        const editor = await db
          .collection<{ id?: string }>('members')
          .findOne({ email }, { projection: { _id: 0, id: 1 } });
        const mid = editor?.id != null ? String(editor.id).trim() : '';
        if (mid) updatedByMemberId = mid;
      }
    }

    let photoDataUrl = await consumePhotoUpload(
      db,
      body.photoUploadId,
      body.photoDataUrl ?? null
    );
    if (photoDataUrl && photoDataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
      photoDataUrl = null;
    }

    const staffRole =
      body.staffRole !== undefined && String(body.staffRole).trim() !== ''
        ? String(body.staffRole).trim()
        : null;
    /** Solo actualiza departamento si el cliente lo envía (p. ej. integraciones); si se omite, no se borra el valor en Mongo. */
    const setPayload: Record<string, unknown> = {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      address: body.address.trim(),
      dob: body.dob,
      spiritualBirthday: body.spiritualBirthday ?? null,
      groups: [...body.groups],
      churchIds: [...body.churchIds],
      membershipStatus: body.membershipStatus,
      photoDataUrl,
      staffRole,
    };
    if (Object.prototype.hasOwnProperty.call(body, 'department')) {
      setPayload.department =
        body.department !== undefined && String(body.department).trim() !== ''
          ? String(body.department).trim()
          : null;
    }
    if (Object.prototype.hasOwnProperty.call(json, 'portalRoleId')) {
      const v = json.portalRoleId;
      setPayload.portalRoleId =
        v === null || v === ''
          ? null
          : typeof v === 'string'
            ? v.trim()
            : null;
    }
    if (Object.prototype.hasOwnProperty.call(json, 'staffRoleGrants')) {
      setPayload.staffRoleGrants = json.staffRoleGrants ?? null;
    }
    if (updatedByMemberId !== undefined) {
      setPayload.updatedByMemberId = updatedByMemberId;
    }
    const normalizedId = id.trim();
    const members = db.collection('members');

    // Primero intenta por `id` (uuid propio de la app).
    let result = await members.updateOne({ id: normalizedId }, { $set: setPayload });

    // Compatibilidad: si la URL trae un ObjectId de Mongo, actualiza por `_id`.
    if (result.matchedCount === 0 && ObjectId.isValid(normalizedId)) {
      result = await members.updateOne(
        { _id: new ObjectId(normalizedId) },
        { $set: { ...setPayload, id: normalizedId } }
      );
    }

    // Si no existe por ninguno de los dos identificadores, crea el documento.
    if (result.matchedCount === 0) {
      const doc: MemberDocument = {
        id: normalizedId,
        createdAt: new Date().toISOString(),
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone.trim(),
        address: body.address.trim(),
        dob: body.dob,
        spiritualBirthday: body.spiritualBirthday ?? null,
        groups: [...body.groups],
        churchIds: [...body.churchIds],
        membershipStatus: body.membershipStatus,
        photoDataUrl,
        department:
          Object.prototype.hasOwnProperty.call(body, 'department') &&
          body.department !== undefined &&
          String(body.department).trim() !== ''
            ? String(body.department).trim()
            : null,
        staffRole,
        portalRoleId: Object.prototype.hasOwnProperty.call(json, 'portalRoleId')
          ? json.portalRoleId === null || json.portalRoleId === ''
            ? null
            : typeof json.portalRoleId === 'string'
              ? json.portalRoleId.trim()
              : null
          : null,
        staffRoleGrants: Object.prototype.hasOwnProperty.call(json, 'staffRoleGrants')
          ? (json.staffRoleGrants as MemberDocument['staffRoleGrants']) ?? null
          : null,
        ...(updatedByMemberId !== undefined ? { updatedByMemberId } : {}),
      };
      await members.insertOne(doc);
    }

    return NextResponse.json({ ok: true, message: 'Cambios guardados correctamente.' });
  } catch (e) {
    console.error('[api/members/[id] PATCH]', e);
    const message =
      e instanceof Error ? e.message : 'Error al actualizar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
