/**
 * Totales anuales consolidados derivados de `records` del registro de asistencia.
 * Se persiste en Mongo al guardar (`PUT /api/attendance/registro`) para reportes y trazabilidad.
 */

export type RegistryMonthKey =
  | 'enero'
  | 'febrero'
  | 'marzo'
  | 'abril'
  | 'mayo'
  | 'junio'
  | 'julio'
  | 'agosto'
  | 'septiembre'
  | 'octubre'
  | 'noviembre'
  | 'diciembre';

export type RegistryCategoryRecord = {
  id: string;
  label: string;
  weeks: number[][];
};

export type RegistryMonthRecord = {
  month: string;
  period: string;
  categories: RegistryCategoryRecord[];
};

export const REGISTRY_MONTH_ORDER: RegistryMonthKey[] = [
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
];

const MONTH_SHORT_LABEL: Record<RegistryMonthKey, string> = {
  enero: 'Ene',
  febrero: 'Feb',
  marzo: 'Mar',
  abril: 'Abr',
  mayo: 'May',
  junio: 'Jun',
  julio: 'Jul',
  agosto: 'Ago',
  septiembre: 'Sep',
  octubre: 'Oct',
  noviembre: 'Nov',
  diciembre: 'Dic',
};

const PEAK_BREAKDOWN_ID_ORDER = ['adultos', 'ninos', 'jovenes', 'nuevos'] as const;

function normalizeString(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function monthTotal(rec: RegistryMonthRecord): number {
  return rec.categories.reduce(
    (sum, category) =>
      sum +
      category.weeks.reduce(
        (categorySum, week) => categorySum + week.reduce((weekTotal, day) => weekTotal + day, 0),
        0
      ),
    0
  );
}

function inferCategoryType(
  category: RegistryCategoryRecord
): 'ninos' | 'jovenes' | 'adultos' | 'nuevos' | 'custom' {
  const idn = String(category.id).trim().toLowerCase();
  if (idn === 'ninos') return 'ninos';
  if (idn === 'jovenes') return 'jovenes';
  if (idn === 'adultos') return 'adultos';
  if (idn === 'nuevos') return 'nuevos';
  const labelNorm = normalizeString(category.label) || category.id;
  if (labelNorm === 'ninos') return 'ninos';
  if (labelNorm === 'jovenes') return 'jovenes';
  if (labelNorm === 'adultos') return 'adultos';
  if (labelNorm === 'nuevos') return 'nuevos';
  return 'custom';
}

function sortKeyForBreakdown(id: string) {
  const idn = id.trim().toLowerCase();
  const ia = PEAK_BREAKDOWN_ID_ORDER.indexOf(idn as (typeof PEAK_BREAKDOWN_ID_ORDER)[number]);
  return ia === -1 ? 100 : ia;
}

export type AttendanceRegistryConsolidatedCategory = {
  id: string;
  label: string;
  total: number;
  kind: 'ninos' | 'jovenes' | 'adultos' | 'nuevos' | 'custom';
};

export type AttendanceRegistryConsolidatedMonthlyPeak = {
  monthKey: RegistryMonthKey;
  monthShort: string;
  total: number;
  weekIndex: number | null;
  byCategory: Array<{ id: string; label: string; total: number; kind: string }>;
};

export type AttendanceRegistryConsolidated = {
  year: string;
  computedAt: string;
  monthsReported: number;
  grandTotal: number;
  annualPeakWeek: number;
  categories: AttendanceRegistryConsolidatedCategory[];
  monthlyPeakWeeks: AttendanceRegistryConsolidatedMonthlyPeak[];
};

function getMonth(
  records: Record<string, RegistryMonthRecord>,
  key: RegistryMonthKey
): RegistryMonthRecord {
  const r = records[key];
  if (r && Array.isArray(r.categories)) return r;
  return { month: key, period: '', categories: [] };
}

/**
 * Calcula el mismo resumen que la tarjeta «Total anual consolidado» en `/attendance/registro`.
 */
export function computeAttendanceRegistryConsolidated(
  records: Record<string, RegistryMonthRecord>,
  year: string,
  computedAt: string = new Date().toISOString()
): AttendanceRegistryConsolidated {
  const monthsReported = REGISTRY_MONTH_ORDER.filter((m) => monthTotal(getMonth(records, m)) > 0).length;

  const grandTotal = REGISTRY_MONTH_ORDER.reduce((sum, m) => sum + monthTotal(getMonth(records, m)), 0);

  const totalsByLabel = new Map<
    string,
    { label: string; id: string; total: number; kind: AttendanceRegistryConsolidatedCategory['kind'] }
  >();

  for (const month of REGISTRY_MONTH_ORDER) {
    const monthRec = getMonth(records, month);
    for (const category of monthRec.categories) {
      const labelNorm = normalizeString(category.label) || category.id;
      const categoryMonthTotal = category.weeks.reduce(
        (sum, week) => sum + week.reduce((weekSum, day) => weekSum + day, 0),
        0
      );
      const kind = inferCategoryType(category);
      const current =
        totalsByLabel.get(labelNorm) ??
        ({
          label: category.label,
          id: category.id,
          total: 0,
          kind,
        } satisfies AttendanceRegistryConsolidatedCategory);
      current.total += categoryMonthTotal;
      totalsByLabel.set(labelNorm, current);
    }
  }

  const categories = Array.from(totalsByLabel.values()).sort(
    (a, b) => b.total - a.total || a.label.localeCompare(b.label, 'es')
  );

  const monthlyPeakWeeks: AttendanceRegistryConsolidatedMonthlyPeak[] = REGISTRY_MONTH_ORDER.map((m) => {
    const monthRec = getMonth(records, m);
    let bestW = 0;
    let bestTotal = 0;
    for (let w = 0; w < 5; w += 1) {
      const t = monthRec.categories.reduce(
        (sum, category) =>
          sum + (category.weeks[w]?.reduce((weekSum, day) => weekSum + day, 0) ?? 0),
        0
      );
      if (t > bestTotal) {
        bestTotal = t;
        bestW = w;
      }
    }

    const byCategory = monthRec.categories
      .map((category) => {
        const total =
          category.weeks[bestW]?.reduce((weekSum, day) => weekSum + day, 0) ?? 0;
        return {
          id: category.id,
          label: category.label,
          total,
          kind: inferCategoryType(category),
        };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => {
        const ra = sortKeyForBreakdown(a.id);
        const rb = sortKeyForBreakdown(b.id);
        if (ra !== rb) return ra - rb;
        return a.label.localeCompare(b.label, 'es');
      });

    return {
      monthKey: m,
      monthShort: MONTH_SHORT_LABEL[m],
      total: bestTotal,
      weekIndex: bestTotal > 0 ? bestW + 1 : null,
      byCategory,
    };
  });

  const annualPeakWeek = monthlyPeakWeeks.reduce((acc, row) => Math.max(acc, row.total), 0);

  return {
    year,
    computedAt,
    monthsReported,
    grandTotal,
    annualPeakWeek,
    categories,
    monthlyPeakWeeks,
  };
}
