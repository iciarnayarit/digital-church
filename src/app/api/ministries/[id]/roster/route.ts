import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDb } from '@/lib/mongodb';
import { isLeadershipStaffRole } from '@/lib/pastor-church-access';
import { exactPastorCanAccessMinistry } from '@/lib/pastor-ministry-access';
import {
  MINISTRIES_COLLECTION,
  type MinistryDocument,
  type MinistryMemberAssignment,
} from '@/lib/ministries';

const deleteBodySchema = z
  .object({
    mode: z.enum(['leader', 'assignment']),
    memberId: z.string().min(1).max(200),
    churchId: z.string().min(1).max(200).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.mode === 'assignment' && !val.churchId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'churchId es obligatorio para quitar una asignación.',
        path: ['churchId'],
      });
    }
  });

function distinctRosterMemberCount(ministry: {
  leaders?: MinistryDocument['leaders'];
  memberAssignments?: MinistryMemberAssignment[];
}): number {
  const s = new Set<string>();
  for (const l of ministry.leaders ?? []) {
    const id = String(l.id ?? '').trim();
    if (id) s.add(id);
  }
  for (const a of ministry.memberAssignments ?? []) {
    const id = String(a.memberId ?? '').trim();
    if (id) s.add(id);
  }
  return s.size;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ministryId } = await context.params;
    const trimmedId = ministryId?.trim() ?? '';
    if (!trimmedId) {
      return NextResponse.json({ error: 'Id inválido.' }, { status: 400 });
    }

    const json = await request.json().catch(() => null);
    const parsed = deleteBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { mode, memberId: rawMemberId, churchId: rawChurchId } = parsed.data;
    const memberId = rawMemberId.trim();
    const churchId = rawChurchId?.trim() ?? '';

    const db = await getDb();
    const ministry = await db
      .collection<MinistryDocument>(MINISTRIES_COLLECTION)
      .findOne({ id: trimmedId }, { projection: { _id: 0 } });
    if (!ministry) {
      return NextResponse.json({ error: 'Ministerio no encontrado.' }, { status: 404 });
    }

    const { userId } = await auth();
    if (userId) {
      const user = await currentUser();
      const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
      if (email) {
        const sessionMember = await db
          .collection<{ id?: string; staffRole?: string | null }>('members')
          .findOne({ email }, { projection: { _id: 0, id: 1, staffRole: 1 } });
        if (sessionMember && isLeadershipStaffRole(sessionMember.staffRole)) {
          const mid = String(sessionMember.id ?? '').trim();
          if (!exactPastorCanAccessMinistry(ministry, mid, email)) {
            return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
          }
        }
      }
    }

    if (mode === 'leader') {
      const leaders = [...(ministry.leaders ?? [])];
      const nextLeaders = leaders.filter((l) => String(l.id).trim() !== memberId);
      if (nextLeaders.length === leaders.length) {
        return NextResponse.json({ error: 'Ese miembro no figura como líder.' }, { status: 400 });
      }
      if (nextLeaders.length === 0) {
        return NextResponse.json(
          { error: 'Debe quedar al menos un líder. Use «Editar ministerio» para sustituir líderes.' },
          { status: 400 }
        );
      }
      const memberCount = distinctRosterMemberCount({
        leaders: nextLeaders,
        memberAssignments: ministry.memberAssignments,
      });
      await db.collection<MinistryDocument>(MINISTRIES_COLLECTION).updateOne(
        { id: trimmedId },
        { $set: { leaders: nextLeaders, memberCount } }
      );
      return NextResponse.json({ ok: true, message: 'Líder retirado del ministerio.' });
    }

    const assignments = [...(ministry.memberAssignments ?? [])];
    const nextAssignments = assignments.filter(
      (a) => !(String(a.memberId).trim() === memberId && String(a.churchId).trim() === churchId)
    );
    if (nextAssignments.length === assignments.length) {
      return NextResponse.json({ error: 'No se encontró esa asignación.' }, { status: 400 });
    }
    const memberCount = distinctRosterMemberCount({
      leaders: ministry.leaders,
      memberAssignments: nextAssignments,
    });
    await db.collection<MinistryDocument>(MINISTRIES_COLLECTION).updateOne(
      { id: trimmedId },
      { $set: { memberAssignments: nextAssignments, memberCount } }
    );

    const ministryName = ministry.name.trim();
    if (ministryName) {
      await db
        .collection('members')
        .updateOne({ id: memberId }, ({ $pull: { groups: ministryName } } as any));
    }

    return NextResponse.json({ ok: true, message: 'Miembro retirado del ministerio.' });
  } catch (e) {
    console.error('[api/ministries/[id]/roster DELETE]', e);
    const message =
      e instanceof Error ? e.message : 'Error al actualizar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
