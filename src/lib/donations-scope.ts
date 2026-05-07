import { auth, currentUser } from '@clerk/nextjs/server';
import type { Db } from 'mongodb';
import { normalizeMemberChurchIds } from '@/lib/member-church-ids';
import { isFullAccessStaffRole } from '@/lib/pastor-church-access';

type MemberScopeDoc = Record<string, unknown> & {
  id?: string;
  email?: string;
  staffRole?: string | null;
};

export type DonationsScope =
  | { kind: 'open' }
  | { kind: 'none' }
  | { kind: 'scoped'; filter: Record<string, unknown> };

/**
 * Alcance de lectura para la colección `donation`: admins sin límite; congregantes por templo + donante;
 * pastores y demás roles de staff por templos en `members.churchIds` / `templeIds`.
 * Sesión sin miembro enlazado por email → sin acceso (misma idea que `/api/fundraising`).
 */
export async function resolveDonationsReadScope(db: Db): Promise<DonationsScope> {
  const { userId } = await auth();
  if (!userId) {
    return { kind: 'open' };
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
  if (!email) {
    return { kind: 'none' };
  }

  const member = await db.collection<MemberScopeDoc>('members').findOne(
    { email },
    { projection: { _id: 0, id: 1, email: 1, staffRole: 1, churchIds: 1, templeIds: 1 } }
  );

  if (member && isFullAccessStaffRole(member.staffRole as string | null | undefined)) {
    return { kind: 'open' };
  }

  if (!member) {
    return { kind: 'none' };
  }

  const clauses: Record<string, unknown>[] = [];
  const churchIds = normalizeMemberChurchIds(member);
  if (churchIds.length > 0) {
    clauses.push({ churchId: { $in: churchIds } });
  } else {
    clauses.push({ churchId: '__no_church_access__' });
  }

  const role = String(member.staffRole ?? '').trim().toLowerCase();
  if (role === 'congregante') {
    const donorId = String(member.id ?? '').trim();
    const donorEmail = String(member.email ?? email).trim().toLowerCase();
    const donorOr: Record<string, unknown>[] = [
      ...(donorId ? [{ 'donor.memberId': donorId }] : []),
      ...(donorEmail ? [{ 'donor.email': donorEmail }] : []),
    ];
    if (donorOr.length > 0) {
      clauses.push({ $or: donorOr });
    }
  }

  if (clauses.length === 1) {
    return { kind: 'scoped', filter: clauses[0]! };
  }
  if (clauses.length > 1) {
    return { kind: 'scoped', filter: { $and: clauses } };
  }

  return { kind: 'none' };
}

export function mergeDonationIdWithScope(
  id: string,
  scope: DonationsScope
): Record<string, unknown> {
  if (scope.kind === 'open') {
    return { id };
  }
  if (scope.kind === 'none') {
    return { id, churchId: '__no_church_access__' };
  }
  return { $and: [{ id }, scope.filter] };
}
