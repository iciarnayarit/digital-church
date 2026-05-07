import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CHURCHES_COLLECTION, type ChurchLocation } from '@/lib/church-locations';
import { getDb } from '@/lib/mongodb';
import { resolveDonationsReadScope } from '@/lib/donations-scope';

const DONATION_COLLECTION = 'donation';

const normalizeComparable = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const paymentMethodSchema = z.enum(['credit-card', 'check', 'cash', 'online']);
const frequencySchema = z.enum(['once', 'weekly', 'biweekly', 'monthly']);
const fundSchema = z.enum([
  'general-fund',
  'local-fund',
  'building-fund',
  'missions-fund',
  'youth-fund',
  'benevolence-fund',
  'pastor-fund',
  'other-fund',
]);

const recordCategorySchema = z.enum(['donations', 'offering', 'pledges', 'campaigns']);

export const createDonationSchema = z
  .object({
    recordCategory: recordCategorySchema.default('donations'),
    donor: z.object({
      memberId: z.string().min(1),
      firstName: z.string().min(1).max(120),
      lastName: z.string().min(1).max(120),
      email: z.string().max(320).optional().default(''),
      phone: z.string().max(40).optional().default(''),
    }),
    churchId: z.string().min(1),
    churchName: z.string().min(1).max(300),
    attendanceEvent: z.object({
      id: z.string().min(1).max(200),
      name: z.string().min(1).max(200),
    }),
    amount: z.number().positive().max(1_000_000_000),
    donationDate: z
      .string()
      .min(1)
      .refine((s) => !Number.isNaN(Date.parse(s)), 'Fecha inválida.'),
    fundCampaign: fundSchema,
    paymentMethod: paymentMethodSchema,
    transferReference: z.string().max(200).optional().default(''),
    donationFrequency: frequencySchema,
    notes: z.string().max(5000).optional().default(''),
    fundraisingCampaignId: z.string().min(1).max(200).optional(),
    fundraisingCampaignName: z.string().min(1).max(300).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === 'online' && !data.transferReference.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['transferReference'],
        message: 'La referencia de transferencia es obligatoria.',
      });
    }
    if (data.recordCategory === 'campaigns') {
      if (!data.fundraisingCampaignId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fundraisingCampaignId'],
          message: 'Seleccione una campaña de recaudación.',
        });
      }
      if (!data.fundraisingCampaignName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fundraisingCampaignName'],
          message: 'Nombre de campaña inválido.',
        });
      }
    }
  });

export type DonationDocument = z.infer<typeof createDonationSchema> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export async function GET() {
  try {
    const db = await getDb();
    const scope = await resolveDonationsReadScope(db);

    let filter: Record<string, unknown> = {};
    if (scope.kind === 'open') {
      filter = {};
    } else if (scope.kind === 'none') {
      filter = { churchId: '__no_church_access__' };
    } else {
      filter = scope.filter;
    }

    const donations = await db
      .collection<DonationDocument>(DONATION_COLLECTION)
      .find(filter, { projection: { _id: 0 } })
      .sort({ donationDate: -1, createdAt: -1 })
      .toArray();

    return NextResponse.json({ donations });
  } catch (e) {
    console.error('[api/donations GET]', e);
    const message =
      e instanceof Error ? e.message : 'Error al leer la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = createDonationSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const payload = parsed.data;

    const db = await getDb();
    const church = await db
      .collection<ChurchLocation>(CHURCHES_COLLECTION)
      .findOne({ id: payload.churchId }, { projection: { _id: 0, id: 1, name: 1 } });

    if (!church) {
      return NextResponse.json(
        { error: 'El templo seleccionado no existe. No se puede guardar la donación.' },
        { status: 400 }
      );
    }
    if (normalizeComparable(church.name) !== normalizeComparable(payload.churchName)) {
      return NextResponse.json(
        {
          error:
            'Los datos del templo no coinciden con el registro. Vuelva a cargar la página y seleccione el templo correcto.',
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const doc: DonationDocument = {
      id: randomUUID(),
      ...payload,
      notes: payload.notes.trim(),
      transferReference: payload.transferReference.trim(),
      donor: {
        ...payload.donor,
        email: payload.donor.email.trim(),
        phone: payload.donor.phone.trim(),
      },
      attendanceEvent: {
        id: payload.attendanceEvent.id.trim(),
        name: payload.attendanceEvent.name.trim(),
      },
      churchName: church.name,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<DonationDocument>(DONATION_COLLECTION).insertOne(doc);

    return NextResponse.json(
      {
        ok: true,
        message: 'Donación guardada correctamente.',
        donation: doc,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('[api/donations POST]', e);
    const message =
      e instanceof Error ? e.message : 'Error al guardar en la base de datos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
