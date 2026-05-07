'use client';

import * as React from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Download,
  FileText,
  Loader2,
  Smile,
  TrendingUp,
  UploadCloud,
  Users,
  UserRoundPlus,
  XCircle,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppHeader } from '@/components/app-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { AttendanceRegistryConsolidated } from '@/lib/attendance-registry-consolidated';

type MonthKey =
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

type CategoryRecord = {
  id: string;
  label: string;
  weeks: number[][];
  isCustom?: boolean;
};

type MonthRecord = {
  month: string;
  period: string;
  categories: CategoryRecord[];
};

type ChurchItem = {
  id: string;
  name: string;
};

type AttendanceRegistryApiRecord = {
  churchId: string;
  churchName: string;
  year: string;
  eventName?: string;
  records: Record<MonthKey, MonthRecord>;
  initializedMonths: MonthKey[];
  /** Presente cuando el registro ya se guardó al menos una vez (servidor). */
  consolidatedAnnual?: AttendanceRegistryConsolidated;
};

const baseCategories: CategoryRecord[] = [
  { id: 'ninos', label: 'Niños', weeks: [] },
  { id: 'jovenes', label: 'Jóvenes', weeks: [] },
  { id: 'adultos', label: 'Adultos', weeks: [] },
  { id: 'nuevos', label: 'Nuevos', weeks: [] },
];

const YEAR_OPTIONS = Array.from({ length: 11 }, (_, index) => (2020 + index).toString());
/** Valor interno del Select para «escribir otro nombre» (no debe coincidir con nombres reales). */
const EVENT_NAME_CUSTOM = '__event_custom__';
const MONTH_ORDER: MonthKey[] = [
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

const MONTH_SHORT_LABEL: Record<MonthKey, string> = {
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

/** Orden del desglose en la semana pico: Adultos, Niños, Jóvenes, Nuevos; el resto por etiqueta. */
const PEAK_BREAKDOWN_ID_ORDER = ['adultos', 'ninos', 'jovenes', 'nuevos'] as const;

const buildWeekFromTotal = () => Array.from({ length: 7 }, () => 0);

const buildWeeks = (totals: number[]) => totals.map(() => buildWeekFromTotal());
const cloneMonthData = (data: Record<MonthKey, MonthRecord>): Record<MonthKey, MonthRecord> =>
  JSON.parse(JSON.stringify(data)) as Record<MonthKey, MonthRecord>;

const normalizeString = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getRowChurchIdFromImportRow = (row: Record<string, string>) =>
  (
    row.churchid ||
    row['church id'] ||
    row.church_id ||
    row.idtemplo ||
    row['id templo'] ||
    row.id_templo ||
    row.idiglesia ||
    row['id iglesia'] ||
    row.id_iglesia ||
    ''
  ).trim();

const getRowChurchNameFromImportRow = (row: Record<string, string>) =>
  (row.iglesia || row.templo || row.church || row.parroquia || row.sede || row.campus || '').trim();

const validateImportRowChurch = (
  row: Record<string, string>,
  churchId: string,
  churchName: string
): { ok: true } | { ok: false; message: string } => {
  const rowId = getRowChurchIdFromImportRow(row);
  const rowName = getRowChurchNameFromImportRow(row);
  if (!rowId && !rowName) return { ok: true };
  if (rowId && rowId !== churchId) {
    return {
      ok: false,
      message:
        'El archivo contiene registros de otro templo (identificador distinto al seleccionado). Se canceló la importación.',
    };
  }
  if (!rowId && rowName && normalizeString(rowName) !== normalizeString(churchName)) {
    return {
      ok: false,
      message: `El archivo indica el templo "${rowName}", que no coincide con el seleccionado (${churchName}).`,
    };
  }
  return { ok: true };
};

const monthMap: Record<string, MonthKey> = {
  enero: 'enero',
  febrero: 'febrero',
  marzo: 'marzo',
  abril: 'abril',
  mayo: 'mayo',
  junio: 'junio',
  julio: 'julio',
  agosto: 'agosto',
  septiembre: 'septiembre',
  setiembre: 'septiembre',
  octubre: 'octubre',
  noviembre: 'noviembre',
  diciembre: 'diciembre',
};

const dayMap: Record<string, number> = {
  lunes: 0,
  martes: 1,
  miercoles: 2,
  jueves: 3,
  viernes: 4,
  sabado: 5,
  domingo: 6,
  l: 0,
  m: 1,
  x: 2,
  j: 3,
  v: 4,
  s: 5,
  d: 6,
};

const createEmptyWeeks = () => Array.from({ length: 5 }, () => Array.from({ length: 7 }, () => 0));
const distributeWeeklyTotal = (total: number) => {
  const safeTotal = Math.max(0, Math.floor(total));
  const base = Math.floor(safeTotal / 7);
  const remainder = safeTotal % 7;
  return Array.from({ length: 7 }, (_, idx) => base + (idx < remainder ? 1 : 0));
};
const WEEK_DAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'] as const;
const IMPORT_DAY_NAMES = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
};

const parseCsvRows = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return [];
  const headers = parseCsvLine(lines[0]).map((header) => normalizeString(header));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  });
};

const initialData: Record<MonthKey, MonthRecord> = {
  enero: {
    month: 'Enero',
    period: 'Q1 PERIOD',
    categories: [
      { id: 'ninos', label: 'Niños', weeks: buildWeeks([45, 42, 48, 50, 0]) },
      { id: 'jovenes', label: 'Jóvenes', weeks: buildWeeks([88, 92, 85, 94, 0]) },
      { id: 'adultos', label: 'Adultos', weeks: buildWeeks([150, 162, 155, 170, 0]) },
      { id: 'nuevos', label: 'Nuevos', weeks: buildWeeks([12, 18, 14, 20, 0]) },
    ],
  },
  febrero: {
    month: 'Febrero',
    period: 'Q1 PERIOD',
    categories: [
      { id: 'ninos', label: 'Niños', weeks: buildWeeks([38, 40, 42, 46, 0]) },
      { id: 'jovenes', label: 'Jóvenes', weeks: buildWeeks([80, 86, 82, 91, 0]) },
      { id: 'adultos', label: 'Adultos', weeks: buildWeeks([145, 152, 149, 161, 0]) },
      { id: 'nuevos', label: 'Nuevos', weeks: buildWeeks([10, 12, 15, 14, 0]) },
    ],
  },
  marzo: {
    month: 'Marzo',
    period: 'Q1 PERIOD',
    categories: [
      { id: 'ninos', label: 'Niños', weeks: buildWeeks([47, 44, 49, 51, 0]) },
      { id: 'jovenes', label: 'Jóvenes', weeks: buildWeeks([91, 95, 93, 97, 0]) },
      { id: 'adultos', label: 'Adultos', weeks: buildWeeks([158, 164, 160, 173, 0]) },
      { id: 'nuevos', label: 'Nuevos', weeks: buildWeeks([14, 19, 17, 21, 0]) },
    ],
  },
  abril: {
    month: 'Abril',
    period: 'Q2 PERIOD',
    categories: [
      { id: 'ninos', label: 'Niños', weeks: buildWeeks([52, 49, 51, 54, 0]) },
      { id: 'jovenes', label: 'Jóvenes', weeks: buildWeeks([98, 96, 99, 102, 0]) },
      { id: 'adultos', label: 'Adultos', weeks: buildWeeks([172, 168, 171, 176, 0]) },
      { id: 'nuevos', label: 'Nuevos', weeks: buildWeeks([18, 16, 19, 21, 0]) },
    ],
  },
  mayo: {
    month: 'Mayo',
    period: 'Q2 PERIOD',
    categories: [
      { id: 'ninos', label: 'Niños', weeks: buildWeeks([50, 48, 52, 55, 0]) },
      { id: 'jovenes', label: 'Jóvenes', weeks: buildWeeks([95, 97, 100, 104, 0]) },
      { id: 'adultos', label: 'Adultos', weeks: buildWeeks([170, 173, 175, 178, 0]) },
      { id: 'nuevos', label: 'Nuevos', weeks: buildWeeks([20, 18, 22, 23, 0]) },
    ],
  },
  junio: {
    month: 'Junio',
    period: 'Q2 PERIOD',
    categories: [
      { id: 'ninos', label: 'Niños', weeks: buildWeeks([53, 51, 54, 56, 0]) },
      { id: 'jovenes', label: 'Jóvenes', weeks: buildWeeks([99, 101, 103, 105, 0]) },
      { id: 'adultos', label: 'Adultos', weeks: buildWeeks([176, 179, 181, 184, 0]) },
      { id: 'nuevos', label: 'Nuevos', weeks: buildWeeks([21, 19, 24, 25, 0]) },
    ],
  },
  julio: {
    month: 'Julio',
    period: 'Q3 PERIOD',
    categories: [
      { id: 'ninos', label: 'Niños', weeks: buildWeeks([55, 52, 56, 58, 0]) },
      { id: 'jovenes', label: 'Jóvenes', weeks: buildWeeks([102, 104, 106, 108, 0]) },
      { id: 'adultos', label: 'Adultos', weeks: buildWeeks([180, 183, 186, 188, 0]) },
      { id: 'nuevos', label: 'Nuevos', weeks: buildWeeks([23, 21, 24, 26, 0]) },
    ],
  },
  agosto: {
    month: 'Agosto',
    period: 'Q3 PERIOD',
    categories: [
      { id: 'ninos', label: 'Niños', weeks: buildWeeks([54, 53, 57, 59, 0]) },
      { id: 'jovenes', label: 'Jóvenes', weeks: buildWeeks([103, 105, 107, 110, 0]) },
      { id: 'adultos', label: 'Adultos', weeks: buildWeeks([182, 185, 187, 190, 0]) },
      { id: 'nuevos', label: 'Nuevos', weeks: buildWeeks([22, 23, 25, 27, 0]) },
    ],
  },
  septiembre: {
    month: 'Septiembre',
    period: 'Q3 PERIOD',
    categories: [
      { id: 'ninos', label: 'Niños', weeks: buildWeeks([56, 54, 58, 60, 0]) },
      { id: 'jovenes', label: 'Jóvenes', weeks: buildWeeks([104, 106, 109, 111, 0]) },
      { id: 'adultos', label: 'Adultos', weeks: buildWeeks([184, 187, 189, 192, 0]) },
      { id: 'nuevos', label: 'Nuevos', weeks: buildWeeks([24, 22, 26, 28, 0]) },
    ],
  },
  octubre: {
    month: 'Octubre',
    period: 'Q4 PERIOD',
    categories: [
      { id: 'ninos', label: 'Niños', weeks: buildWeeks([57, 55, 59, 61, 0]) },
      { id: 'jovenes', label: 'Jóvenes', weeks: buildWeeks([106, 108, 110, 113, 0]) },
      { id: 'adultos', label: 'Adultos', weeks: buildWeeks([186, 189, 191, 194, 0]) },
      { id: 'nuevos', label: 'Nuevos', weeks: buildWeeks([25, 24, 27, 29, 0]) },
    ],
  },
  noviembre: {
    month: 'Noviembre',
    period: 'Q4 PERIOD',
    categories: [
      { id: 'ninos', label: 'Niños', weeks: buildWeeks([58, 56, 60, 62, 0]) },
      { id: 'jovenes', label: 'Jóvenes', weeks: buildWeeks([107, 109, 112, 114, 0]) },
      { id: 'adultos', label: 'Adultos', weeks: buildWeeks([188, 191, 193, 196, 0]) },
      { id: 'nuevos', label: 'Nuevos', weeks: buildWeeks([26, 25, 28, 30, 0]) },
    ],
  },
  diciembre: {
    month: 'Diciembre',
    period: 'Q4 PERIOD',
    categories: [
      { id: 'ninos', label: 'Niños', weeks: buildWeeks([59, 57, 61, 63, 0]) },
      { id: 'jovenes', label: 'Jóvenes', weeks: buildWeeks([108, 110, 113, 116, 0]) },
      { id: 'adultos', label: 'Adultos', weeks: buildWeeks([190, 193, 195, 198, 0]) },
      { id: 'nuevos', label: 'Nuevos', weeks: buildWeeks([27, 26, 29, 31, 0]) },
    ],
  },
};

export default function AttendanceRegistroPage() {
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const currentYear = new Date().getFullYear().toString();
  const [expandedMonth, setExpandedMonth] = React.useState<MonthKey>('enero');
  const [recordsByYear, setRecordsByYear] = React.useState<
    Record<string, Record<MonthKey, MonthRecord>>
  >(() =>
    Object.fromEntries(
      YEAR_OPTIONS.map((year) => [year, cloneMonthData(initialData)])
    ) as Record<string, Record<MonthKey, MonthRecord>>
  );
  const [selectedYear, setSelectedYear] = React.useState<string>(
    YEAR_OPTIONS.includes(currentYear) ? currentYear : YEAR_OPTIONS[0]
  );
  const [initializedMonthsByYear, setInitializedMonthsByYear] = React.useState<
    Record<string, MonthKey[]>
  >(() =>
    Object.fromEntries(
      YEAR_OPTIONS.map((year) => [year, [...MONTH_ORDER] as MonthKey[]])
    ) as Record<string, MonthKey[]>
  );
  const [churches, setChurches] = React.useState<ChurchItem[]>([]);
  const [selectedChurchId, setSelectedChurchId] = React.useState<string>('');
  const [churchesState, setChurchesState] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [newCategoryByMonth, setNewCategoryByMonth] = React.useState<Record<MonthKey, string>>({
    enero: '',
    febrero: '',
    marzo: '',
    abril: '',
    mayo: '',
    junio: '',
    julio: '',
    agosto: '',
    septiembre: '',
    octubre: '',
    noviembre: '',
    diciembre: '',
  });
  const [inlineCategoryInputByMonth, setInlineCategoryInputByMonth] = React.useState<
    Record<MonthKey, boolean>
  >({
    enero: false,
    febrero: false,
    marzo: false,
    abril: false,
    mayo: false,
    junio: false,
    julio: false,
    agosto: false,
    septiembre: false,
    octubre: false,
    noviembre: false,
    diciembre: false,
  });
  const [editingCategoryByMonth, setEditingCategoryByMonth] = React.useState<
    Partial<Record<MonthKey, string | null>>
  >({});
  const [editingCategoryLabel, setEditingCategoryLabel] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isLoadingRegistry, setIsLoadingRegistry] = React.useState(false);
  const [lastSavedByYearAndChurch, setLastSavedByYearAndChurch] = React.useState<
    Record<string, AttendanceRegistryApiRecord>
  >({});
  const [eventName, setEventName] = React.useState('');
  const [eventNameSuggestions, setEventNameSuggestions] = React.useState<string[]>([]);
  const [eventNamesLoading, setEventNamesLoading] = React.useState(false);

  const monthOrder: MonthKey[] = MONTH_ORDER;
  const yearOptions = YEAR_OPTIONS;
  const currentYearRecords = recordsByYear[selectedYear] ?? cloneMonthData(initialData);
  const initializedMonths = initializedMonthsByYear[selectedYear] ?? (['enero'] as MonthKey[]);
  const selectedChurchName =
    churches.find((church) => church.id === selectedChurchId)?.name ?? 'Templo no seleccionado';
  const saveKey = `${selectedChurchId || 'none'}:${selectedYear}`;

  const monthIndexByKey: Record<MonthKey, number> = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    octubre: 9,
    noviembre: 10,
    diciembre: 11,
  };
  const todayStart = React.useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const weekDaysForMonth = (month: MonthKey, weekIndex: number) => {
    const year = Number(selectedYear);
    const monthIndex = monthIndexByKey[month];
    const firstDay = new Date(year, monthIndex, 1);
    const firstWeekdayMondayBased = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    return Array.from({ length: 7 }, (_, dayIndex) => {
      const dayNumber = weekIndex * 7 + dayIndex - firstWeekdayMondayBased + 1;
      const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
      const dateObj = inMonth ? new Date(year, monthIndex, dayNumber) : null;
      const canEdit = Boolean(dateObj && dateObj.getTime() < todayStart.getTime());
      const monthLabel = String(monthIndex + 1).padStart(2, '0');
      return {
        dayLabel: WEEK_DAY_LABELS[dayIndex],
        dateLabel: inMonth ? String(dayNumber).padStart(2, '0') : '--',
        fullDateLabel: inMonth ? `${String(dayNumber).padStart(2, '0')}/${monthLabel}/${year}` : '--/--/----',
        inMonth,
        canEdit,
      };
    });
  };

  const totalByCategoryInMonth = (month: MonthKey, categoryId: string) =>
    currentYearRecords[month].categories
      .find((category) => category.id === categoryId)
      ?.weeks.reduce(
        (sum, week) => sum + week.reduce((weekTotal, dayValue) => weekTotal + dayValue, 0),
        0
      ) ?? 0;

  const weekTotalByCategory = (month: MonthKey, categoryId: string, weekIndex: number) =>
    currentYearRecords[month].categories
      .find((category) => category.id === categoryId)
      ?.weeks[weekIndex]?.reduce((sum, day) => sum + day, 0) ?? 0;

  const monthWeekTotal = (month: MonthKey, weekIndex: number) =>
    currentYearRecords[month].categories.reduce(
      (sum, category) => sum + (category.weeks[weekIndex]?.reduce((weekSum, day) => weekSum + day, 0) ?? 0),
      0
    );

  const updateDayValue = (
    month: MonthKey,
    categoryId: string,
    weekIndex: number,
    dayIndex: number,
    value: string
  ) => {
    const next = Number(value);
    setRecordsByYear((prev) => ({
      ...prev,
      [selectedYear]: {
        ...currentYearRecords,
        [month]: {
          ...currentYearRecords[month],
          categories: currentYearRecords[month].categories.map((category) =>
          category.id !== categoryId
            ? category
            : {
                ...category,
                weeks: category.weeks.map((week, idx) =>
                  idx !== weekIndex
                    ? week
                    : week.map((dayValue, dayIdx) =>
                        dayIdx === dayIndex
                          ? Number.isNaN(next)
                            ? 0
                            : Math.max(0, next)
                          : dayValue
                      )
                ),
              }
          ),
        },
      },
    }));
  };

  const updateWeekTotal = (
    month: MonthKey,
    categoryId: string,
    weekIndex: number,
    value: string
  ) => {
    const next = Number(value);
    const nextWeek = distributeWeeklyTotal(Number.isNaN(next) ? 0 : next);

    setRecordsByYear((prev) => ({
      ...prev,
      [selectedYear]: {
        ...currentYearRecords,
        [month]: {
          ...currentYearRecords[month],
          categories: currentYearRecords[month].categories.map((category) =>
            category.id !== categoryId
              ? category
              : {
                  ...category,
                  weeks: category.weeks.map((week, idx) => (idx === weekIndex ? nextWeek : week)),
                }
          ),
        },
      },
    }));
  };

  const categoryTotal = (month: MonthKey, categoryId: string) =>
    totalByCategoryInMonth(month, categoryId);

  const monthTotal = (month: MonthKey) =>
    currentYearRecords[month].categories.reduce(
      (sum, category) =>
        sum +
        category.weeks.reduce(
          (categorySum, week) => categorySum + week.reduce((weekTotal, dayValue) => weekTotal + dayValue, 0),
          0
        ),
      0
    );

  const annualCategoryTotal = (categoryId: string) =>
    monthOrder.reduce((sum, month) => sum + totalByCategoryInMonth(month, categoryId), 0);

  const annualCategoryCards = React.useMemo(() => {
    const totalsByLabel = new Map<
      string,
      { label: string; total: number; type: 'ninos' | 'jovenes' | 'adultos' | 'nuevos' | 'custom' }
    >();

    for (const month of monthOrder) {
      for (const category of currentYearRecords[month].categories) {
        const labelNorm = normalizeString(category.label) || category.id;
        const categoryMonthTotal = category.weeks.reduce(
          (sum, week) => sum + week.reduce((weekSum, day) => weekSum + day, 0),
          0
        );
        const current =
          totalsByLabel.get(labelNorm) ??
          {
            label: category.label,
            total: 0,
            type:
              labelNorm === 'ninos'
                ? 'ninos'
                : labelNorm === 'jovenes'
                  ? 'jovenes'
                  : labelNorm === 'adultos'
                    ? 'adultos'
                    : labelNorm === 'nuevos'
                      ? 'nuevos'
                      : 'custom',
          };
        current.total += categoryMonthTotal;
        totalsByLabel.set(labelNorm, current);
      }
    }

    return Array.from(totalsByLabel.values()).sort(
      (a, b) => b.total - a.total || a.label.localeCompare(b.label, 'es')
    );
  }, [currentYearRecords]);

  const monthsReported = React.useMemo(
    () => monthOrder.filter((month) => monthTotal(month) > 0).length,
    [recordsByYear, selectedYear]
  );

  const annualGrandTotal = React.useMemo(
    () => monthOrder.reduce((sum, month) => sum + monthTotal(month), 0),
    [recordsByYear, selectedYear]
  );

  /** Por cada mes: semana con mayor total y desglose por categoría (etiquetas reales de ese mes). */
  const weeklyPeakByMonth = React.useMemo(() => {
    const inferType = (
      category: CategoryRecord
    ): 'ninos' | 'jovenes' | 'adultos' | 'nuevos' | 'custom' => {
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
    };

    const sortKeyForBreakdown = (id: string) => {
      const idn = id.trim().toLowerCase();
      const ia = PEAK_BREAKDOWN_ID_ORDER.indexOf(idn as (typeof PEAK_BREAKDOWN_ID_ORDER)[number]);
      return ia === -1 ? 100 : ia;
    };

    return monthOrder.map((m) => {
      const monthRec = currentYearRecords[m];
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

      const breakdown = monthRec.categories
        .map((category) => {
          const total =
            category.weeks[bestW]?.reduce((weekSum, day) => weekSum + day, 0) ?? 0;
          return {
            id: category.id,
            label: category.label,
            total,
            type: inferType(category),
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
        key: m,
        label: MONTH_SHORT_LABEL[m],
        max: bestTotal,
        weekIndex: bestTotal > 0 ? bestW + 1 : null,
        breakdown,
      };
    });
  }, [currentYearRecords]);

  const annualPeakWeek = React.useMemo(
    () => weeklyPeakByMonth.reduce((acc, row) => Math.max(acc, row.max), 0),
    [weeklyPeakByMonth]
  );

  const handleAddCategory = (month: MonthKey) => {
    const nextLabel = newCategoryByMonth[month].trim();
    if (!nextLabel) return;

    const nextId = `custom-${nextLabel.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    setRecordsByYear((prev) => ({
      ...prev,
      [selectedYear]: {
        ...currentYearRecords,
        [month]: {
          ...currentYearRecords[month],
          categories: [
            ...currentYearRecords[month].categories,
            {
              id: nextId,
              label: nextLabel,
              weeks: Array.from({ length: 5 }, () => Array.from({ length: 7 }, () => 0)),
              isCustom: true,
            },
          ],
        },
      },
    }));
    setNewCategoryByMonth((prev) => ({ ...prev, [month]: '' }));
    setInlineCategoryInputByMonth((prev) => ({ ...prev, [month]: false }));
  };

  const handleRemoveCategory = (month: MonthKey, categoryId: string) => {
    const category = currentYearRecords[month].categories.find((item) => item.id === categoryId);
    if (!category) return;

    setRecordsByYear((prev) => ({
      ...prev,
      [selectedYear]: {
        ...currentYearRecords,
        [month]: {
          ...currentYearRecords[month],
          categories: currentYearRecords[month].categories.filter((item) => item.id !== categoryId),
        },
      },
    }));
    toast({
      title: 'Categoría eliminada',
      description: `Se eliminó la columna "${category.label}".`,
    });
  };

  const handleStartEditCategory = (month: MonthKey, categoryId: string) => {
    const category = currentYearRecords[month].categories.find((item) => item.id === categoryId);
    if (!category) return;
    setEditingCategoryByMonth((prev) => ({ ...prev, [month]: categoryId }));
    setEditingCategoryLabel(category.label);
  };

  const handleSaveCategoryTitle = (month: MonthKey, categoryId: string) => {
    const nextLabel = editingCategoryLabel.trim();
    if (!nextLabel) {
      setEditingCategoryByMonth((prev) => ({ ...prev, [month]: null }));
      return;
    }
    setRecordsByYear((prev) => ({
      ...prev,
      [selectedYear]: {
        ...currentYearRecords,
        [month]: {
          ...currentYearRecords[month],
          categories: currentYearRecords[month].categories.map((item) =>
            item.id === categoryId ? { ...item, label: nextLabel } : item
          ),
        },
      },
    }));
    setEditingCategoryByMonth((prev) => ({ ...prev, [month]: null }));
  };

  const handleInitializeMonth = (month: MonthKey) => {
    setInitializedMonthsByYear((prev) => {
      const current = prev[selectedYear] ?? (['enero'] as MonthKey[]);
      if (current.includes(month)) return prev;
      return {
        ...prev,
        [selectedYear]: [...current, month],
      };
    });
    setExpandedMonth(month);
    toast({
      title: `${currentYearRecords[month].month} inicializado`,
      description: 'Ya puedes capturar asistencia semanal en este mes.',
    });
  };

  const handleSaveRegistry = async () => {
    if (!selectedChurchId) {
      toast({
        variant: 'destructive',
        title: 'Selecciona un templo',
        description: 'Debes seleccionar un templo para guardar la asistencia.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload: AttendanceRegistryApiRecord = {
        churchId: selectedChurchId,
        churchName: selectedChurchName,
        year: selectedYear,
        eventName: eventName.trim(),
        records: currentYearRecords,
        initializedMonths,
      };
      const response = await fetch('/api/attendance/registro', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        consolidatedAnnual?: AttendanceRegistryConsolidated;
      };
      if (!response.ok) {
        throw new Error(json.error || 'No se pudo guardar la asistencia.');
      }
      const storedEventName =
        eventName.trim().length > 0
          ? eventName.trim()
          : `Asistencia anual ${selectedYear}`;
      setEventName(storedEventName);
      setLastSavedByYearAndChurch((prev) => ({
        ...prev,
        [saveKey]: {
          ...payload,
          eventName: storedEventName,
          ...(json.consolidatedAnnual ? { consolidatedAnnual: json.consolidatedAnnual } : {}),
        },
      }));
      toast({
        title: 'Asistencia guardada',
        description: json.message || 'Los cambios fueron guardados correctamente.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    const snapshot = lastSavedByYearAndChurch[saveKey];
    if (!snapshot) {
      setRecordsByYear((prev) => ({ ...prev, [selectedYear]: cloneMonthData(initialData) }));
      setInitializedMonthsByYear((prev) => ({ ...prev, [selectedYear]: [...MONTH_ORDER] }));
      setEventName('');
      toast({
        title: 'Cambios descartados',
        description: 'Se restauró el estado inicial para este año.',
      });
      return;
    }
    setRecordsByYear((prev) => ({ ...prev, [selectedYear]: snapshot.records }));
    setInitializedMonthsByYear((prev) => ({
      ...prev,
      [selectedYear]: snapshot.initializedMonths,
    }));
    setEventName(snapshot.eventName ?? '');
    toast({
      title: 'Cambios descartados',
      description: 'Se restauraron los últimos datos guardados.',
    });
  };

  const insight = React.useMemo(() => {
    const q1Months: MonthKey[] = ['enero', 'febrero', 'marzo'];
    const q2Months: MonthKey[] = ['abril', 'mayo', 'junio'];
    const categoryTotals = new Map<string, { label: string; q1: number; q2: number }>();

    for (const month of [...q1Months, ...q2Months]) {
      for (const category of currentYearRecords[month].categories) {
        const prev = categoryTotals.get(category.id) ?? { label: category.label, q1: 0, q2: 0 };
        const monthTotalValue = totalByCategoryInMonth(month, category.id);
        if (q1Months.includes(month)) {
          prev.q1 += monthTotalValue;
        } else {
          prev.q2 += monthTotalValue;
        }
        categoryTotals.set(category.id, prev);
      }
    }

    const categoryArray = Array.from(categoryTotals.values());
    if (categoryArray.length === 0) {
      return { growthText: '0%', message: 'No hay datos para mostrar crecimiento.' };
    }

    const sorted = categoryArray
      .map((entry) => ({
        ...entry,
        growth: entry.q1 > 0 ? ((entry.q2 - entry.q1) / entry.q1) * 100 : entry.q2 > 0 ? 100 : 0,
      }))
      .sort((a, b) => b.growth - a.growth);

    const top = sorted[0];
    const growthText = `${top.growth >= 0 ? '+' : ''}${Math.round(top.growth)}%`;
    return {
      growthText,
      message: `La categoría "${top.label}" muestra el mayor crecimiento entre Q1 y Q2.`,
    };
  }, [currentYearRecords]);

  const getMonthFromDate = (dateRaw: string) => {
    const maybeDate = new Date(dateRaw);
    if (Number.isNaN(maybeDate.getTime())) return null;
    return MONTH_ORDER[maybeDate.getMonth()];
  };

  const extractRowsFromFile = async (file: File) => {
    if (file.name.toLowerCase().endsWith('.csv')) {
      const text = await file.text();
      return parseCsvRows(text);
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
      defval: '',
      raw: false,
    });

    return rawRows.map((row) => {
      const normalized: Record<string, string> = {};
      Object.entries(row).forEach(([key, value]) => {
        normalized[normalizeString(key)] = String(value ?? '').trim();
      });
      return normalized;
    });
  };

  const handlePickImportFile = () => {
    if (!selectedChurchId) {
      toast({
        variant: 'destructive',
        title: 'Selecciona un templo',
        description: 'Debes seleccionar un templo antes de importar asistencia.',
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleDownloadImportTemplate = () => {
    if (!selectedChurchId) {
      toast({
        variant: 'destructive',
        title: 'Selecciona un templo',
        description: 'Debes seleccionar un templo antes de descargar la plantilla.',
      });
      return;
    }

    const rows: Array<Record<string, string | number>> = [];
    for (const month of monthOrder) {
      const monthLabel = currentYearRecords[month].month;
      const categories = currentYearRecords[month].categories;
      for (let weekIndex = 0; weekIndex < 5; weekIndex += 1) {
        const weekDays = weekDaysForMonth(month, weekIndex);
        for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
          const dayInfo = weekDays[dayIndex];
          for (const category of categories) {
            rows.push({
              churchId: selectedChurchId,
              iglesia: selectedChurchName,
              year: selectedYear,
              mes: monthLabel,
              semana: weekIndex + 1,
              dia: IMPORT_DAY_NAMES[dayIndex],
              diaCorto: dayInfo.dayLabel,
              diaNumero: dayInfo.dateLabel,
              fecha: dayInfo.fullDateLabel,
              categoria: category.label,
              asistencia: '',
            });
          }
        }
      }
    }

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, 'PlantillaAsistencia');
    const safeChurchName = selectedChurchName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    const fileName = `plantilla-asistencia-${selectedYear}-${safeChurchName || 'templo'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast({
      title: 'Plantilla descargada',
      description: `Se descargó el formato para ${selectedChurchName} (${selectedYear}).`,
    });
  };

  const handleImportMonthlyData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedChurchId) {
      toast({
        variant: 'destructive',
        title: 'Selecciona un templo',
        description: 'Debes seleccionar un templo antes de importar asistencia.',
      });
      return;
    }

    setIsImporting(true);
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const rows = await extractRowsFromFile(file);
      if (rows.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Archivo sin datos',
          description: 'No encontramos filas para importar.',
        });
        return;
      }

      for (const row of rows) {
        const categoryLabel = row.categoria || row.category || row.grupo || '';
        const attendanceRaw = row.asistencia || row.attendance || row.valor || row.total || '';
        if (!categoryLabel || !attendanceRaw) continue;
        const attendance = Number(attendanceRaw);
        if (Number.isNaN(attendance) || attendance < 0) continue;

        const churchCheck = validateImportRowChurch(row, selectedChurchId, selectedChurchName);
        if (!churchCheck.ok) {
          toast({
            variant: 'destructive',
            title: 'Importación cancelada',
            description: churchCheck.message,
          });
          return;
        }
      }

      const nextYearRecords = cloneMonthData(currentYearRecords);
      let importedCount = 0;

      for (const row of rows) {
        const categoryLabel = row.categoria || row.category || row.grupo || '';
        const attendanceRaw = row.asistencia || row.attendance || row.valor || row.total || '';
        const weekRaw = row.semana || row.week || '';
        const dayRaw = row.dia || row.day || '';
        const monthRaw = row.mes || row.month || '';
        const dateRaw = row.fecha || row.date || '';

        if (!categoryLabel || !attendanceRaw) continue;

        const attendance = Number(attendanceRaw);
        if (Number.isNaN(attendance) || attendance < 0) continue;

        const categoryNorm = normalizeString(categoryLabel);
        const existingByNorm = Object.values(nextYearRecords)
          .flatMap((month) => month.categories)
          .find((category) => normalizeString(category.label) === categoryNorm);

        const categoryId =
          existingByNorm?.id ??
          `custom-${categoryNorm.replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 8)}`;

        const targetMonth =
          monthMap[normalizeString(monthRaw)] ?? (dateRaw ? getMonthFromDate(dateRaw) : null);
        if (!targetMonth) continue;

        let weekIndex = Number(weekRaw) - 1;
        let dayIndex = dayMap[normalizeString(dayRaw)];

        if (Number.isNaN(weekIndex) && dateRaw) {
          const parsedDate = new Date(dateRaw);
          if (!Number.isNaN(parsedDate.getTime())) {
            weekIndex = Math.min(4, Math.max(0, Math.floor((parsedDate.getDate() - 1) / 7)));
            dayIndex = parsedDate.getDay() === 0 ? 6 : parsedDate.getDay() - 1;
          }
        }

        if (Number.isNaN(weekIndex) || weekIndex < 0 || weekIndex > 4) continue;
        if (typeof dayIndex !== 'number' || dayIndex < 0 || dayIndex > 6) continue;

        const monthCategories = nextYearRecords[targetMonth].categories;
        const categoryIdx = monthCategories.findIndex((category) => category.id === categoryId);
        if (categoryIdx === -1) {
          monthCategories.push({
            id: categoryId,
            label: categoryLabel.trim(),
            weeks: createEmptyWeeks(),
            isCustom: true,
          });
        }

        const targetCategory = monthCategories.find((category) => category.id === categoryId);
        if (!targetCategory) continue;

        targetCategory.weeks[weekIndex][dayIndex] = attendance;
        importedCount += 1;
      }

      setRecordsByYear((prev) => ({
        ...prev,
        [selectedYear]: nextYearRecords,
      }));

      toast({
        title: 'Importación completada',
        description: `Se importaron ${importedCount} registros para el año ${selectedYear}.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al importar',
        description: error instanceof Error ? error.message : 'No se pudo procesar el archivo.',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  React.useEffect(() => {
    const loadChurches = async () => {
      setChurchesState('loading');
      try {
        /** Mismos templos que el miembro en sesión (`churchIds`); admins globales ven todos (API). */
        const response = await fetch('/api/churches?sessionChurchScope=1', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const json = (await response.json().catch(() => ({}))) as {
          churches?: ChurchItem[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(json.error || 'No se pudo cargar la lista de templos.');
        }
        const nextChurches = (json.churches ?? []).sort((a, b) =>
          a.name.localeCompare(b.name, 'es')
        );
        setChurches(nextChurches);
        setSelectedChurchId((prev) => {
          if (prev && nextChurches.some((c) => c.id === prev)) return prev;
          return nextChurches[0]?.id ?? '';
        });
        setChurchesState('ready');
      } catch (error) {
        setChurchesState('error');
        toast({
          variant: 'destructive',
          title: 'No se pudieron cargar los templos',
          description: error instanceof Error ? error.message : 'Inténtalo nuevamente.',
        });
      }
    };
    void loadChurches();
  }, [toast]);

  React.useEffect(() => {
    if (!selectedChurchId) {
      setEventName('');
      return;
    }

    let cancelled = false;
    const loadRegistry = async () => {
      setIsLoadingRegistry(true);
      setEventName('');
      try {
        const response = await fetch(
          `/api/attendance/registro?churchId=${encodeURIComponent(selectedChurchId)}&year=${encodeURIComponent(selectedYear)}`,
          {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          }
        );
        const json = (await response.json().catch(() => ({}))) as {
          record?: AttendanceRegistryApiRecord | null;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(json.error || 'No se pudo cargar el registro de asistencia.');
        }
        if (cancelled) return;
        if (!json.record) {
          setRecordsByYear((prev) => ({ ...prev, [selectedYear]: cloneMonthData(initialData) }));
          setInitializedMonthsByYear((prev) => ({ ...prev, [selectedYear]: [...MONTH_ORDER] }));
          return;
        }
        const record = json.record;
        setRecordsByYear((prev) => ({ ...prev, [selectedYear]: record.records }));
        setInitializedMonthsByYear((prev) => ({
          ...prev,
          [selectedYear]:
            record.initializedMonths.length > 0 ? record.initializedMonths : [...MONTH_ORDER],
        }));
        setLastSavedByYearAndChurch((prev) => ({ ...prev, [saveKey]: record }));
        setEventName(record.eventName?.trim() ? record.eventName.trim() : '');
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error al cargar asistencia',
          description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        });
      } finally {
        if (!cancelled) {
          setIsLoadingRegistry(false);
        }
      }
    };
    void loadRegistry();
    return () => {
      cancelled = true;
    };
  }, [selectedChurchId, selectedYear, toast, saveKey]);

  React.useEffect(() => {
    if (!selectedChurchId.trim()) {
      setEventNameSuggestions([]);
      setEventNamesLoading(false);
      return;
    }
    let cancelled = false;
    setEventNamesLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/attendance/registro/event-names?churchId=${encodeURIComponent(selectedChurchId)}&year=${encodeURIComponent(selectedYear)}`,
          { cache: 'no-store', headers: { Accept: 'application/json' } }
        );
        const json = (await res.json().catch(() => ({}))) as { names?: string[] };
        if (cancelled) return;
        setEventNameSuggestions(Array.isArray(json.names) ? json.names : []);
      } catch {
        if (!cancelled) setEventNameSuggestions([]);
      } finally {
        if (!cancelled) setEventNamesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      setEventNamesLoading(false);
    };
  }, [selectedChurchId, selectedYear]);

  const eventNameSelectValue = React.useMemo(() => {
    if (!eventName.trim()) return '';
    if (eventNameSuggestions.includes(eventName)) return eventName;
    return EVENT_NAME_CUSTOM;
  }, [eventName, eventNameSuggestions]);

  const showCustomEventNameInput =
    Boolean(selectedChurchId) &&
    !isLoadingRegistry &&
    !eventNamesLoading &&
    eventNameSuggestions.length > 0 &&
    eventNameSelectValue === EVENT_NAME_CUSTOM;

  return (
    <div className="relative flex flex-1 flex-col">
      {isImporting ? (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/75 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-14 w-14 animate-spin text-primary" aria-hidden />
          <p className="text-xl font-semibold text-foreground">Cargando datos en el formulario…</p>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Procesando el archivo e incorporando asistencia por mes y día. Espera un momento.
          </p>
        </div>
      ) : null}
      <AppHeader
        title={`Asistencia Anual ${selectedYear}`}
        description={`Registro centralizado de métricas por categorías. Templo seleccionado: ${selectedChurchName}.`}
      />

      <main className="flex-1 space-y-5 bg-muted/20 p-4 sm:p-8">
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Selecciona el templo para guardar asistencia
                </p>
                <Select
                  value={selectedChurchId}
                  onValueChange={setSelectedChurchId}
                  disabled={churchesState !== 'ready' || churches.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        churchesState === 'loading'
                          ? 'Cargando templos...'
                          : 'Selecciona un templo'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {churches.map((church) => (
                      <SelectItem key={church.id} value={church.id}>
                        {church.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Selecciona el año de asistencia
                </p>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un año" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Seleccione el evento
              </Label>
              {!selectedChurchId ? (
                <Select disabled>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccione primero un templo" />
                  </SelectTrigger>
                </Select>
              ) : isLoadingRegistry ? (
                <Select disabled>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Cargando registro…" />
                  </SelectTrigger>
                </Select>
              ) : eventNamesLoading ? (
                <Select disabled>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Cargando eventos…" />
                  </SelectTrigger>
                </Select>
              ) : eventNameSuggestions.length > 0 ? (
                <div className="space-y-2">
                  <Select
                    value={eventNameSelectValue === '' ? undefined : eventNameSelectValue}
                    onValueChange={(v) => {
                      if (v === EVENT_NAME_CUSTOM) {
                        setEventName((prev) =>
                          eventNameSuggestions.includes(prev) ? '' : prev
                        );
                        return;
                      }
                      setEventName(v);
                    }}
                  >
                    <SelectTrigger className="w-full" id="attendance-event-name-select">
                      <SelectValue placeholder="Seleccione un evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventNameSuggestions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                      <SelectItem value={EVENT_NAME_CUSTOM}>Otro nombre…</SelectItem>
                    </SelectContent>
                  </Select>
                  {showCustomEventNameInput ? (
                    <Input
                      id="attendance-event-name-custom"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="Ej. Culto dominical, vigilia, campamento…"
                      maxLength={200}
                      autoComplete="off"
                      aria-label="Nombre del evento (texto libre)"
                    />
                  ) : null}
                </div>
              ) : (
                <Input
                  id="attendance-event-name-when-empty-suggestions"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder={`Asistencia anual ${selectedYear} (opcional)`}
                  maxLength={200}
                  autoComplete="off"
                  disabled={isLoadingRegistry}
                  aria-label="Nombre del evento"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {monthOrder.map((monthKey) => {
          const monthData = currentYearRecords[monthKey];
          const expanded = expandedMonth === monthKey;
          const isMonthInitialized = initializedMonths.includes(monthKey);
          return (
            <Card key={monthKey} className="overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedMonth(monthKey)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 p-2 text-primary">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-2xl font-bold leading-tight">{monthData.month}</p>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                      {monthData.period}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase text-primary">
                      ID: {selectedYear}-{String(monthIndexByKey[monthKey] + 1).padStart(2, '0')}
                    </p>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Participantes totales
                    </p>
                    <p className="text-4xl font-bold text-primary">
                      {monthTotal(monthKey).toLocaleString()}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn('h-5 w-5 text-muted-foreground transition-transform', expanded && 'rotate-180')}
                  />
                </div>
              </button>

              {expanded ? (
                isMonthInitialized ? (
                <CardContent className="border-t p-4 md:p-6">
                  <div className="grid grid-cols-1 gap-4">
                    {Array.from({ length: 5 }, (_, weekIndex) => {
                      const weekDays = weekDaysForMonth(monthKey, weekIndex);
                      return (
                        <Card
                          key={`${monthKey}-week-${weekIndex}`}
                          className="border bg-background"
                        >
                          <CardContent className="space-y-4 p-4">
                            <div className="flex items-center justify-between">
                              <p className="text-lg font-bold text-foreground">
                                Semana {weekIndex + 1}
                              </p>
                              <p className="text-sm font-semibold text-primary">
                                Total semana: {monthWeekTotal(monthKey, weekIndex)}
                              </p>
                            </div>

                            <div className="space-y-3">
                              <div className="overflow-x-auto">
                                <div
                                  className="grid min-w-[760px] gap-2"
                                  style={{
                                    gridTemplateColumns: `140px repeat(${currentYearRecords[monthKey].categories.length}, minmax(96px, 1fr)) 180px`,
                                  }}
                                >
                                  <div className="rounded-lg border bg-muted/40 px-3 py-2 text-center text-xs font-semibold uppercase text-muted-foreground">
                                    Día
                                  </div>
                                  {currentYearRecords[monthKey].categories.map((category) => (
                                    <div
                                      key={`head-${category.id}-${weekIndex}`}
                                      className="relative rounded-lg border bg-muted/40 px-3 py-2 text-center text-xs font-semibold uppercase text-muted-foreground"
                                      onDoubleClick={() => handleStartEditCategory(monthKey, category.id)}
                                      title="Doble clic para editar título"
                                    >
                                      <button
                                        type="button"
                                        className="absolute right-1 top-1 text-muted-foreground hover:text-destructive"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleRemoveCategory(monthKey, category.id);
                                        }}
                                        aria-label={`Eliminar columna ${category.label}`}
                                        title={`Eliminar ${category.label}`}
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </button>
                                      {editingCategoryByMonth[monthKey] === category.id ? (
                                        <Input
                                          autoFocus
                                          value={editingCategoryLabel}
                                          onChange={(event) => setEditingCategoryLabel(event.target.value)}
                                          onBlur={() => handleSaveCategoryTitle(monthKey, category.id)}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                              event.preventDefault();
                                              handleSaveCategoryTitle(monthKey, category.id);
                                            }
                                            if (event.key === 'Escape') {
                                              setEditingCategoryByMonth((prev) => ({ ...prev, [monthKey]: null }));
                                            }
                                          }}
                                          className="h-8 border bg-background text-center text-xs font-semibold uppercase"
                                        />
                                      ) : (
                                        <button type="button" className="w-full text-center" tabIndex={-1}>
                                          {category.label}
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <div className="rounded-lg border bg-muted/40 px-3 py-2 text-center text-xs font-semibold uppercase text-muted-foreground">
                                    Nueva categoría
                                  </div>

                                  {weekDays.map((day, dayIndex) => (
                                    <React.Fragment key={`row-${monthKey}-${weekIndex}-${dayIndex}`}>
                                      <div
                                        className={cn(
                                          'rounded-lg border px-3 py-2 text-center',
                                          day.inMonth
                                            ? 'bg-background text-foreground'
                                            : 'bg-muted/20 text-muted-foreground'
                                        )}
                                      >
                                        <p className="text-xs font-semibold uppercase">{day.dayLabel}</p>
                                        <p className="text-lg font-bold">{day.dateLabel}</p>
                                        <p className="text-[10px] text-muted-foreground">{day.fullDateLabel}</p>
                                      </div>
                                      {currentYearRecords[monthKey].categories.map((category) => (
                                        <Input
                                          key={`input-${category.id}-${weekIndex}-${dayIndex}`}
                                          type="number"
                                          min={0}
                                          value={category.weeks[weekIndex]?.[dayIndex] ?? 0}
                                          disabled={!day.canEdit}
                                          onChange={(event) =>
                                            updateDayValue(
                                              monthKey,
                                              category.id,
                                              weekIndex,
                                              dayIndex,
                                              event.target.value
                                            )
                                          }
                                          className={cn(
                                            'h-12 rounded-lg border text-center text-xl font-bold',
                                            day.canEdit
                                              ? 'bg-muted'
                                              : 'bg-muted/30 text-muted-foreground'
                                          )}
                                        />
                                      ))}
                                      <div className="flex items-center">
                                        {dayIndex === 6 ? (
                                          inlineCategoryInputByMonth[monthKey] ? (
                                            <Input
                                              autoFocus
                                              value={newCategoryByMonth[monthKey]}
                                              onChange={(event) =>
                                                setNewCategoryByMonth((prev) => ({
                                                  ...prev,
                                                  [monthKey]: event.target.value,
                                                }))
                                              }
                                              onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                  event.preventDefault();
                                                  handleAddCategory(monthKey);
                                                }
                                                if (event.key === 'Escape') {
                                                  setInlineCategoryInputByMonth((prev) => ({
                                                    ...prev,
                                                    [monthKey]: false,
                                                  }));
                                                }
                                              }}
                                              placeholder="Nombre"
                                              className="h-12 rounded-lg text-center font-semibold"
                                            />
                                          ) : (
                                            <Button
                                              type="button"
                                              variant="outline"
                                              className="h-12 w-full text-xs font-semibold"
                                              onClick={() =>
                                                setInlineCategoryInputByMonth((prev) => ({
                                                  ...prev,
                                                  [monthKey]: true,
                                                }))
                                              }
                                            >
                                              Nueva Categoría
                                            </Button>
                                          )
                                        ) : (
                                          <div className="h-12 w-full rounded-lg border bg-muted/20" />
                                        )}
                                      </div>
                                    </React.Fragment>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <Card className="mt-4 border bg-muted/10">
                    <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_1fr]">
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">Total General Mes</p>
                        <p className="mt-1 text-3xl font-extrabold text-primary">{monthTotal(monthKey)}</p>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: 5 }, (_, weekIndex) => (
                          <div key={`summary-${monthKey}-${weekIndex}`} className="rounded-lg border bg-background p-2 text-center">
                            <p className="text-[11px] font-semibold text-muted-foreground">S{weekIndex + 1}</p>
                            <p className="text-lg font-bold">{monthWeekTotal(monthKey, weekIndex)}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="mt-4 border-dashed">
                    <CardContent className="space-y-3 p-4">
                      <Input
                        value={newCategoryByMonth[monthKey]}
                        onChange={(event) =>
                          setNewCategoryByMonth((prev) => ({
                            ...prev,
                            [monthKey]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleAddCategory(monthKey);
                          }
                        }}
                        placeholder='Nueva categoría (después de "Nuevos")'
                        className="h-11 rounded-xl bg-background"
                      />
                      <p className="text-xs text-muted-foreground">
                        Agrega una categoría personalizada para capturar más registros mensuales.
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full md:w-auto"
                        onClick={() => handleAddCategory(monthKey)}
                        disabled={!newCategoryByMonth[monthKey].trim()}
                      >
                        Agregar categoría
                      </Button>
                    </CardContent>
                  </Card>
                </CardContent>
                ) : (
                <CardContent className="border-t p-0">
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center text-muted-foreground">
                    <span className="rounded-full bg-muted p-3">
                      <ClipboardCheck className="h-8 w-8" />
                    </span>
                    <p className="text-3xl font-semibold">Registros en curso...</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleInitializeMonth(monthKey)}
                    >
                      Inicializar Mes
                    </Button>
                  </div>
                </CardContent>
                )
              ) : null}
            </Card>
          );
        })}

        <section className="space-y-6">
          <Card className={cn('overflow-hidden border-dashed', isImporting && 'pointer-events-none opacity-60')}>
            <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-6 p-6 text-center sm:p-10">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleImportMonthlyData}
              />
              <span className="rounded-full bg-sky-100 p-6 text-sky-500">
                <UploadCloud className="h-10 w-10" />
              </span>
              <div className="space-y-2">
                <p className="text-5xl font-extrabold tracking-tight">Importar Datos Mensuales</p>
                <p className="text-2xl text-muted-foreground">
                  Selecciona un Excel o CSV para cargar asistencia por mes y día.
                </p>
                <p className="text-base text-muted-foreground">
                  Los registros se asocian al templo elegido arriba. Si el archivo trae columnas de iglesia o ID de
                  templo, deben coincidir con la selección actual.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Button
                  type="button"
                  className="h-16 min-w-[320px] bg-sky-500 text-2xl font-semibold hover:bg-sky-600"
                  onClick={handlePickImportFile}
                  disabled={isImporting || !selectedChurchId || churchesState !== 'ready' || churches.length === 0}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                      Procesando…
                    </>
                  ) : (
                    'Seleccionar archivo'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-16 min-w-[320px] text-xl font-semibold"
                  onClick={handleDownloadImportTemplate}
                  disabled={isImporting || !selectedChurchId || churchesState !== 'ready' || churches.length === 0}
                >
                  <Download className="mr-2 h-5 w-5" />
                  Descargar Excel ejemplo
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-50">
            <CardContent className="space-y-6 p-6 md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 text-4xl font-bold">
                    <FileText className="h-6 w-6 text-blue-300" />
                    Total Anual Consolidado {selectedYear}
                  </p>
                  <p className="mt-2 text-xl text-slate-300">
                    Resumen estadístico de todas las categorías activas.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 px-5 py-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Meses reportados
                    </p>
                    <p className="mt-1 text-4xl font-extrabold">{String(monthsReported).padStart(2, '0')}/12</p>
                  </div>
                  <div className="rounded-xl border border-blue-500/30 bg-blue-900/20 px-5 py-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      Gran total
                    </p>
                    <p className="mt-1 text-4xl font-extrabold">{annualGrandTotal}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-5 py-3 text-center">
                    <p className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-300" aria-hidden />
                      Pico semanal del año
                    </p>
                    <p className="mt-1 text-4xl font-extrabold text-emerald-100">{annualPeakWeek}</p>
                    <p className="mt-1 text-[11px] leading-tight text-slate-400">
                      Mayor semana entre todos los meses (todas las categorías).
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {annualCategoryCards.map((category) => (
                  <div
                    key={category.label}
                    className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-5"
                  >
                    <p className="inline-flex items-center gap-2 text-2xl font-bold">
                      <span
                        className={cn(
                          'rounded-lg p-2',
                          category.type === 'ninos' && 'bg-blue-500/20 text-blue-300',
                          category.type === 'jovenes' && 'bg-violet-500/20 text-violet-300',
                          category.type === 'adultos' && 'bg-amber-500/20 text-amber-300',
                          category.type === 'nuevos' && 'bg-emerald-500/20 text-emerald-300',
                          category.type === 'custom' && 'bg-cyan-500/20 text-cyan-300'
                        )}
                      >
                        {category.type === 'ninos' ? (
                          <Smile className="h-5 w-5" />
                        ) : category.type === 'nuevos' ? (
                          <UserRoundPlus className="h-5 w-5" />
                        ) : category.type === 'custom' ? (
                          <FileText className="h-5 w-5" />
                        ) : (
                          <Users className="h-5 w-5" />
                        )}
                      </span>
                      {category.label}
                    </p>
                    <p className="mt-3 text-5xl font-extrabold">{category.total}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-700/50 pt-6">
                <p className="inline-flex items-center gap-2 text-xl font-bold text-slate-100">
                  <CalendarDays className="h-5 w-5 text-emerald-300" aria-hidden />
                  Máximo registro semanal por mes
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  En cada mes se toma la semana con mayor asistencia total; debajo verás cómo aportó cada categoría
                  (nombres tal como están en ese mes, incluidas columnas personalizadas).
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
                  {weeklyPeakByMonth.map((row) => (
                    <div
                      key={row.key}
                      className="rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-3 text-left"
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-slate-700/50 pb-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {row.label}
                          </p>
                          {row.weekIndex != null ? (
                            <p className="mt-0.5 text-[10px] text-slate-500">Semana {row.weekIndex}</p>
                          ) : null}
                        </div>
                        <p className="text-xl font-extrabold tabular-nums text-emerald-100">{row.max}</p>
                      </div>
                      {row.max === 0 ? (
                        <p className="mt-2 text-center text-xs text-slate-500">Sin datos</p>
                      ) : (
                        <ul className="mt-2 space-y-1.5">
                          {row.breakdown.map((b) => (
                            <li
                              key={b.id}
                              className="flex items-center justify-between gap-2 text-[11px] leading-tight"
                            >
                              <span
                                className={cn(
                                  'min-w-0 truncate',
                                  b.type === 'ninos' && 'text-blue-200',
                                  b.type === 'jovenes' && 'text-violet-200',
                                  b.type === 'adultos' && 'text-amber-200',
                                  b.type === 'nuevos' && 'text-emerald-200',
                                  b.type === 'custom' && 'text-cyan-200'
                                )}
                                title={b.label}
                              >
                                {b.label}
                              </span>
                              <span className="shrink-0 font-semibold tabular-nums text-slate-100">{b.total}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col items-center justify-center gap-4 pb-4 sm:flex-row">
            <Button
              type="button"
              className="h-14 min-w-[320px] text-xl"
              onClick={handleSaveRegistry}
              disabled={isSaving || isLoadingRegistry || isImporting || !selectedChurchId}
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              {isSaving ? 'Guardando...' : `Guardar Registro ${selectedYear}`}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
