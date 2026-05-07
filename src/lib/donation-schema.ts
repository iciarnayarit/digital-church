import { z } from 'zod';

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

