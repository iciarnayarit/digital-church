import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDb } from '@/lib/mongodb';
import { isFullAccessStaffRole } from '@/lib/pastor-church-access';
import type { FundraisingCampaignDoc, FundraisingStatus } from '@/lib/fundraising-seed';

const COLLECTION = 'fundraising';

const STATUSES: FundraisingStatus[] = ['Active', 'Completed', 'Upcoming', 'Draft'];

function computeProgress(raised: number, goal: number | null): number {
  if (goal == null || goal <= 0) return 0;
  return Math.round((raised / goal) * 100);
}

async function resolveId(
  context: { params: Promise<{ id: string }> }
): Promise<string> {
  const resolved = await context.params;
  return resolved?.id?.trim() ?? '';
}

async function getFundraisingCollection() {
  const db = await getDb();
  return db.collection<FundraisingCampaignDoc>(COLLECTION);
}

async function assertViewerCanEditCampaign(
  existing: FundraisingCampaignDoc
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, status: 401, message: 'Debe iniciar sesión.' };
  }
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
  if (!email) {
    return { ok: false, status: 403, message: 'No autorizado.' };
  }
  const db = await getDb();
  const member = await db
    .collection<{ id?: string; staffRole?: string | null }>('members')
    .findOne({ email }, { projection: { _id: 0, id: 1, staffRole: 1 } });
  if (member && isFullAccessStaffRole(member.staffRole)) {
    return { ok: true };
  }
  const byMember = String(existing.createdByMemberId ?? '').trim();
  if (byMember && member?.id && byMember === String(member.id).trim()) {
    return { ok: true };
  }
  const byClerk = String(existing.createdByClerkUserId ?? '').trim();
  if (byClerk && byClerk === userId) {
    return { ok: true };
  }
  return { ok: false, status: 403, message: 'Solo quien creó la campaña puede editarla.' };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await resolveId(context);
    if (!id) {
      return NextResponse.json({ error: 'Id inválido.' }, { status: 400 });
    }

    const collection = await getFundraisingCollection();
    const campaign = await collection.findOne({ id }, { projection: { _id: 0 } });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (e) {
    console.error('[api/fundraising/[id] GET]', e);
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
    const id = await resolveId(context);
    if (!id) {
      return NextResponse.json({ error: 'Id inválido.' }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
    }

    const collection = await getFundraisingCollection();
    const existing = await collection.findOne({ id }, { projection: { _id: 0 } });

    if (!existing) {
      return NextResponse.json({ error: 'Campaña no encontrada.' }, { status: 404 });
    }

    const authz = await assertViewerCanEditCampaign(existing);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.message }, { status: authz.status });
    }

    const next: FundraisingCampaignDoc = { ...existing };

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: 'El título no puede estar vacío.' }, { status: 400 });
      }
      next.name = name;
    }

    if (typeof body.description === 'string') {
      next.description = body.description.trim();
    }

    if (body.status !== undefined) {
      if (typeof body.status !== 'string' || !STATUSES.includes(body.status as FundraisingStatus)) {
        return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
      }
      next.status = body.status as FundraisingStatus;
    }

    if (body.raised !== undefined) {
      const raised = Number(body.raised);
      if (!Number.isFinite(raised) || raised < 0) {
        return NextResponse.json({ error: 'Monto recaudado inválido.' }, { status: 400 });
      }
      next.raised = raised;
    }

    if (body.goal !== undefined) {
      if (body.goal === null) {
        next.goal = null;
      } else {
        const goal = Number(body.goal);
        if (!Number.isFinite(goal) || goal < 0) {
          return NextResponse.json({ error: 'Meta inválida.' }, { status: 400 });
        }
        next.goal = goal;
      }
    }

    if (typeof body.date === 'string') {
      next.date = body.date.trim();
    }

    next.progress = computeProgress(next.raised, next.goal);

    await collection.updateOne({ id }, { $set: next });

    return NextResponse.json({ campaign: next });
  } catch (e) {
    console.error('[api/fundraising/[id] PATCH]', e);
    const message =
      e instanceof Error ? e.message : 'Error al guardar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
