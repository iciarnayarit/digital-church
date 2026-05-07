import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/mongodb';

const ATTENDANCE_COLLECTION = 'attendance';

/** Acepta `params` como Promise (Next 15) u objeto plano. */
async function resolveRouteId(
  context: { params: Promise<{ id: string }> }
): Promise<string> {
  const resolved = await context.params;
  return resolved?.id?.trim() ?? '';
}

export type ChurchAttendanceEvent = {
  id: string;
  churchId: string;
  eventType: 'service' | 'event';
  eventName: string;
  attendanceMode: 'presencial' | 'online';
  eventWeekday: string | null;
  eventTime: string;
  eventStartDate: string | null;
  eventEndDate: string | null;
  notes: string;
  createdAt: string;
};

const createChurchAttendanceSchema = z.object({
  eventType: z.enum(['service', 'event']),
  eventName: z.string().min(1).max(200),
  attendanceMode: z.enum(['presencial', 'online']),
  eventWeekday: z.string().max(30).optional().default(''),
  eventTime: z.string().min(1).max(20),
  eventStartDate: z.string().max(100).optional().default(''),
  eventEndDate: z.string().max(100).optional().default(''),
  notes: z.string().max(3000).optional().default(''),
}).superRefine((value, ctx) => {
  if (value.eventType === 'service') {
    if (!value.eventWeekday.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['eventWeekday'],
        message: 'El día de la semana es requerido para servicios.',
      });
    }
  }
  if (value.eventType === 'event') {
    if (!value.eventStartDate.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['eventStartDate'],
        message: 'La fecha de inicio es requerida para eventos.',
      });
    }
  }
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await resolveRouteId(context);
    if (!id) {
      return NextResponse.json({ error: 'Id inválido.' }, { status: 400 });
    }
    const db = await getDb();
    /** Solo campos livianos: la colección `attendance` también guarda registros anuales masivos con `records`. */
    const raw = await db
      .collection(ATTENDANCE_COLLECTION)
      .find(
        {
          churchId: id,
          /** Excluye registros anuales (misma colección, sin `eventType`). */
          eventType: { $in: ['service', 'event'] },
        },
        {
          projection: {
            _id: 0,
            id: 1,
            churchId: 1,
            eventName: 1,
            eventType: 1,
            attendanceMode: 1,
            eventWeekday: 1,
            eventTime: 1,
            eventStartDate: 1,
            eventEndDate: 1,
            notes: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .toArray();

    const records: ChurchAttendanceEvent[] = [];
    for (let i = 0; i < raw.length; i += 1) {
      const doc = raw[i];
      if (String(doc?.churchId ?? '').trim() !== id) continue;
      const eventName =
        typeof doc.eventName === 'string' ? doc.eventName.trim() : '';
      if (!eventName) continue;

      const rowId =
        typeof doc.id === 'string' && doc.id.trim()
          ? doc.id.trim()
          : `attendance-${id}-item-${i}`;

      records.push({
        id: rowId,
        churchId: id,
        eventType:
          doc.eventType === 'service' || doc.eventType === 'event'
            ? doc.eventType
            : 'event',
        eventName,
        attendanceMode:
          doc.attendanceMode === 'online' || doc.attendanceMode === 'presencial'
            ? doc.attendanceMode
            : 'presencial',
        eventWeekday:
          doc.eventWeekday === null || typeof doc.eventWeekday === 'string'
            ? doc.eventWeekday ?? null
            : null,
        eventTime: typeof doc.eventTime === 'string' ? doc.eventTime : '',
        eventStartDate:
          doc.eventStartDate === null || typeof doc.eventStartDate === 'string'
            ? doc.eventStartDate ?? null
            : null,
        eventEndDate:
          doc.eventEndDate === null || typeof doc.eventEndDate === 'string'
            ? doc.eventEndDate ?? null
            : null,
        notes: typeof doc.notes === 'string' ? doc.notes : '',
        createdAt:
          typeof doc.createdAt === 'string'
            ? doc.createdAt
            : typeof doc.updatedAt === 'string'
              ? doc.updatedAt
              : new Date(0).toISOString(),
      });
    }

    return NextResponse.json({ records });
  } catch (e) {
    console.error('[api/churches/[id]/attendance GET]', e);
    const message =
      e instanceof Error ? e.message : 'Error al leer la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await resolveRouteId(context);
    if (!id) {
      return NextResponse.json({ error: 'Id inválido.' }, { status: 400 });
    }
    const json = await request.json();
    const parsed = createChurchAttendanceSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;
    const record: ChurchAttendanceEvent = {
      id: randomUUID(),
      churchId: id.trim(),
      eventType: body.eventType,
      eventName: body.eventName.trim(),
      attendanceMode: body.attendanceMode,
      eventWeekday: body.eventWeekday.trim() || null,
      eventTime: body.eventTime.trim(),
      eventStartDate: body.eventStartDate.trim() || null,
      eventEndDate: body.eventEndDate.trim() || null,
      notes: body.notes.trim(),
      createdAt: new Date().toISOString(),
    };
    const db = await getDb();
    await db.collection<ChurchAttendanceEvent>(ATTENDANCE_COLLECTION).insertOne(record);
    return NextResponse.json(
      { ok: true, message: 'Servicio/evento registrado correctamente.', record },
      { status: 201 }
    );
  } catch (e) {
    console.error('[api/churches/[id]/attendance POST]', e);
    const message =
      e instanceof Error ? e.message : 'Error al guardar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const churchId = await resolveRouteId(context);
    if (!churchId) {
      return NextResponse.json({ error: 'Id inválido.' }, { status: 400 });
    }
    const recordId =
      new URL(request.url).searchParams.get('recordId')?.trim() ?? '';
    if (!recordId || recordId.startsWith('registry-') || recordId.startsWith('attendance-')) {
      return NextResponse.json(
        { error: 'No se puede eliminar este registro.' },
        { status: 400 }
      );
    }
    const db = await getDb();
    const result = await db.collection(ATTENDANCE_COLLECTION).deleteOne({
      churchId,
      id: recordId,
      eventType: { $in: ['service', 'event'] },
    });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      message: 'Registro eliminado correctamente.',
    });
  } catch (e) {
    console.error('[api/churches/[id]/attendance DELETE]', e);
    const message =
      e instanceof Error ? e.message : 'Error al eliminar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
