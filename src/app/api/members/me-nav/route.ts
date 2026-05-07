import { getDb } from '@/lib/mongodb';
import { isFullAccessStaffRole, isLeadershipStaffRole } from '@/lib/pastor-church-access';
import type { StaffRoleDocument } from '@/lib/staff-roles';
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/** Misma matriz de módulos que antes tenía solo el rol «Pastor». */
const LEADERSHIP_PORTAL_MODULES = {
  Panel: ['Panel'],
  Iglesias: ['Añadir Ubicación', 'Buscar'],
  Ministerios: ['Nuevo Ministerio', 'Gestionar', 'Asignar Miembros'],
  Asistencia: ['Servicio', 'Registro', 'Reporte'],
  Ofrendas: [
    'Añadir Ofrenda',
    'Crear Campaña',
    'Donaciones y ofrendas',
    'Declaración de Donación',
    'Recaudación de Fondos',
  ],
  Directorio: ['Mis Datos', 'Añadir', 'Miembros', 'Pastoral'],
  Inventario: ['Gestión de inventario', 'Nueva Artículo'],
} as const;

type MemberNavDoc = {
  staffRole?: string | null;
  portalRoleId?: string | null;
  /** Copia embebida opcional: nombre, descripción y permisos (sincronizada con el rol del portal). */
  staffRoleGrants?: {
    roleId: string;
    name: string;
    description: string;
    modules: Record<string, string[]>;
  } | null;
};

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ access: 'full' as const, staffRole: null });
    }

    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ access: 'full' as const, staffRole: null });
    }

    const db = await getDb();
    const member = await db.collection<MemberNavDoc>('members').findOne(
      { email },
      { projection: { _id: 0, staffRole: 1, portalRoleId: 1, staffRoleGrants: 1 } }
    );

    if (!member) {
      return NextResponse.json({ access: 'full' as const, staffRole: null });
    }

    const staffRole = member.staffRole ?? null;
    const sr = String(member.staffRole ?? '').trim().toLowerCase();
    if (isFullAccessStaffRole(staffRole)) {
      return NextResponse.json({ access: 'full' as const, staffRole });
    }

    // Regla fija solicitada para Congregante.
    if (sr === 'congregante') {
      return NextResponse.json({
        access: 'partial' as const,
        modules: {
          Iglesias: ['Buscar'],
          Ofrendas: [
            'Añadir Ofrenda',
            'Donaciones y ofrendas',
            'Declaración de Donación',
            'Recaudación de Fondos',
          ],
          Directorio: ['Pastoral'],
        },
        staffRole,
      });
    }

    if (isLeadershipStaffRole(staffRole)) {
      return NextResponse.json({
        access: 'partial' as const,
        modules: LEADERSHIP_PORTAL_MODULES,
        staffRole,
      });
    }

    if (member.staffRoleGrants?.modules && Object.keys(member.staffRoleGrants.modules).length > 0) {
      return NextResponse.json({
        access: 'partial' as const,
        modules: member.staffRoleGrants.modules,
        staffRole,
      });
    }

    const roleId = String(member.portalRoleId ?? '').trim();
    if (!roleId) {
      // Si no hay roleId embebido, intentar resolver por nombre del staffRole (p. ej. Pastor/Congregante).
      if (sr) {
        const roleByName = await db.collection<StaffRoleDocument>('staff_roles').findOne(
          { name: { $regex: `^${sr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
          { projection: { _id: 0, modules: 1 } }
        );
        if (roleByName?.modules && Object.keys(roleByName.modules).length > 0) {
          return NextResponse.json({
            access: 'partial' as const,
            modules: roleByName.modules,
            staffRole,
          });
        }
      }
      return NextResponse.json({ access: 'full' as const, staffRole });
    }

    const role = await db.collection<StaffRoleDocument>('staff_roles').findOne(
      { id: roleId },
      { projection: { _id: 0, modules: 1 } }
    );

    if (!role?.modules || Object.keys(role.modules).length === 0) {
      return NextResponse.json({ access: 'full' as const, staffRole });
    }

    return NextResponse.json({
      access: 'partial' as const,
      modules: role.modules,
      staffRole,
    });
  } catch (e) {
    console.error('[api/members/me-nav GET]', e);
    return NextResponse.json({ access: 'full' as const, staffRole: null });
  }
}
