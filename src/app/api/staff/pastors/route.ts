import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { isPastorScopedRole } from '@/lib/pastor-church-access';

type MemberDoc = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  membershipStatus?: string;
  photoDataUrl?: string | null;
  staffRole?: string | null;
  department?: string | null;
};

type PastorRow = {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'Activo' | 'Visitante' | 'Inactivo';
  email: string;
  phone: string;
  avatarUrl: string | null;
};

function statusLabel(code: unknown): PastorRow['status'] {
  if (code === 'visitor') return 'Visitante';
  if (code === 'inactive') return 'Inactivo';
  return 'Activo';
}

export async function GET() {
  try {
    const db = await getDb();
    const members = await db.collection<MemberDoc>('members').find({}).toArray();

    const pastors = members
      .filter((m) => isPastorScopedRole(m.staffRole))
      .map((m): PastorRow => {
        const firstName = String(m.firstName ?? '').trim();
        const lastName = String(m.lastName ?? '').trim();
        const name = `${firstName} ${lastName}`.trim() || 'Sin nombre';
        const roleLabel = String(m.staffRole ?? '').trim() || 'Pastor';
        return {
          id: String(m.id ?? ''),
          name,
          role: roleLabel,
          department: String(m.department ?? '').trim() || 'Pastoral',
          status: statusLabel(m.membershipStatus),
          email: String(m.email ?? '').trim(),
          phone: String(m.phone ?? '').trim(),
          avatarUrl: m.photoDataUrl ?? null,
        };
      })
      .sort((a, b) =>
      a.name.localeCompare(b.name, 'es')
    );
    return NextResponse.json({ pastors });
  } catch (e) {
    console.error('[api/staff/pastors GET]', e);
    const message =
      e instanceof Error ? e.message : 'Error al leer miembros.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
