import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CHURCHES_COLLECTION, type ChurchLocation } from '@/lib/church-locations';
import {
  computeAttendanceRegistryConsolidated,
  type AttendanceRegistryConsolidated,
  type RegistryMonthRecord,
} from '@/lib/attendance-registry-consolidated';
import { getDb } from '@/lib/mongodb';

const normalizeComparable = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const ATTENDANCE_REGISTRY_COLLECTION = 'attendance';

const monthKeySchema = z.enum([
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]);

const categoryRecordSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  weeks: z.array(z.array(z.number().min(0))).length(5),
  isCustom: z.boolean().optional(),
});

const monthRecordSchema = z.object({
  month: z.string().min(1),
  period: z.string().min(1),
  categories: z.array(categoryRecordSchema),
});

const recordsSchema = z.record(monthKeySchema, monthRecordSchema);

const saveSchema = z.object({
  churchId: z.string().min(1),
  churchName: z.string().min(1),
  year: z.string().regex(/^\d{4}$/),
  eventName: z
    .string()
    .max(200, 'El nombre del evento es demasiado largo')
    .optional()
    .transform((s) => (s ?? '').trim()),
  records: recordsSchema,
  initializedMonths: z.array(monthKeySchema),
});

type AttendanceRegistryDoc = z.infer<typeof saveSchema> & {
  createdAt: string;
  updatedAt: string;
  /** Derivado de `records` al guardar (total anual consolidado, picos por mes, etc.). */
  consolidatedAnnual?: AttendanceRegistryConsolidated;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const churchId = url.searchParams.get('churchId')?.trim() ?? '';
    const year = url.searchParams.get('year')?.trim() ?? '';
    if (!churchId || !year) {
      return NextResponse.json(
        { error: 'churchId y year son requeridos.' },
        { status: 400 }
      );
    }
    const db = await getDb();
    const doc = await db
      .collection<AttendanceRegistryDoc>(ATTENDANCE_REGISTRY_COLLECTION)
      .findOne(
        { churchId, year },
        {
          projection: {
            _id: 0,
            churchId: 1,
            churchName: 1,
            year: 1,
            eventName: 1,
            records: 1,
            initializedMonths: 1,
            consolidatedAnnual: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        }
      );

    return NextResponse.json({ record: doc ?? null });
  } catch (e) {
    console.error('[api/attendance/registro GET]', e);
    const message = e instanceof Error ? e.message : 'Error al leer la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const json = await request.json();
    const parsed = saveSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const payload = parsed.data;
    const now = new Date().toISOString();
    const db = await getDb();
    const church = await db
      .collection<ChurchLocation>(CHURCHES_COLLECTION)
      .findOne({ id: payload.churchId }, { projection: { _id: 0, id: 1, name: 1 } });

    if (!church) {
      return NextResponse.json(
        { error: 'El templo seleccionado no existe. No se puede guardar la asistencia.' },
        { status: 400 }
      );
    }
    if (normalizeComparable(church.name) !== normalizeComparable(payload.churchName)) {
      return NextResponse.json(
        {
          error:
            'Los datos del templo no coinciden con el registro. Vuelve a cargar la página y selecciona el templo correcto.',
        },
        { status: 400 }
      );
    }

    const eventNameStored =
      payload.eventName.length > 0
        ? payload.eventName
        : `Asistencia anual ${payload.year}`;

    const consolidatedAnnual = computeAttendanceRegistryConsolidated(
      payload.records as Record<string, RegistryMonthRecord>,
      payload.year,
      now
    );

    await db.collection<AttendanceRegistryDoc>(ATTENDANCE_REGISTRY_COLLECTION).updateOne(
      { churchId: payload.churchId, year: payload.year },
      {
        $set: {
          churchName: church.name,
          eventName: eventNameStored,
          records: payload.records,
          initializedMonths: payload.initializedMonths,
          consolidatedAnnual,
          updatedAt: now,
        },
        $setOnInsert: {
          churchId: payload.churchId,
          year: payload.year,
          createdAt: now,
        },
      },
      { upsert: true }
    );
    return NextResponse.json({
      ok: true,
      message: 'Asistencia guardada correctamente.',
      consolidatedAnnual,
    });
  } catch (e) {
    console.error('[api/attendance/registro PUT]', e);
    const message = e instanceof Error ? e.message : 'Error al guardar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
