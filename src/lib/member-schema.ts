import { z } from 'zod';

export const createMemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.string().min(1),
  dob: z.string().min(1),
  spiritualBirthday: z.string().nullable().optional(),
  groups: z.array(z.string()).default([]),
  /** Ids de documentos en la colección `churches` (y opcionalmente `otro`). */
  churchIds: z.array(z.string()).default([]),
  membershipStatus: z.string().min(1),
  photoDataUrl: z.string().nullable().optional(),
  /** Imagen ya guardada vía POST /api/member-photo-uploads al seleccionar archivo. */
  photoUploadId: z.string().uuid().optional(),
  /**
   * Departamento organizacional (opcional). Ausente o vacío → `null` en Mongo.
   * El alta/edición por UI ya no lo envía; puede seguir existiendo en datos antiguos o vía API.
   */
  department: z.string().max(120).optional(),
  staffRole: z.string().max(200).optional(),
  /** Id del documento en la colección `staff_roles`. */
  portalRoleId: z.string().uuid().nullable().optional(),
  staffRoleGrants: z
    .object({
      roleId: z.string().uuid(),
      name: z.string().min(1),
      description: z.string(),
      modules: z.record(z.array(z.string())),
    })
    .nullable()
    .optional(),
});

