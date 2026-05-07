import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getDb } from '@/lib/mongodb';
import {
  mongoOrMemberBelongsToChurch,
  normalizeMemberChurchIds,
} from '@/lib/member-church-ids';
import {
  isFullAccessStaffRole,
  isPastorScopedRole,
  resolvePastorChurchAccess,
} from '@/lib/pastor-church-access';
import { MINISTRIES_COLLECTION, type MinistryDocument } from '@/lib/ministries';
import type {
  DashboardChartMonth,
  DashboardDemographicSlice,
  DashboardPrayerItem,
  DashboardStats,
  DashboardUpcomingEvent,
  TimeRangeParam,
} from '@/lib/dashboard-stats';

const DONATION_COLLECTION = 'donation';
const MEMBERS_COLLECTION = 'members';
const ATTENDANCE_EVENTS_COLLECTION = 'attendance';
const MEMBER_ATTENDANCE_COLLECTION = 'member_attendance';

const DEMO_FILLS = ['hsl(217 91% 60%)', 'hsl(252 82% 64%)', 'hsl(45 93% 58%)', 'hsl(142 71% 45%)'];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function lastDayOfMonth(y: number, m0: number): Date {
  return new Date(y, m0 + 1, 0, 23, 59, 59, 999);
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) {
    if (current <= 0) return null;
    return 100;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function periodBounds(range: TimeRangeParam): {
  curStart: Date;
  curEnd: Date;
  prevStart: Date;
  prevEnd: Date;
} {
  const now = new Date();
  const curEnd = now;
  let curStart: Date;
  let prevStart: Date;
  let prevEnd: Date;

  switch (range) {
    case 'this-week': {
      const dow = now.getDay();
      const offset = dow === 0 ? -6 : 1 - dow;
      curStart = startOfDay(addDays(now, offset));
      prevEnd = addDays(curStart, -1);
      prevStart = startOfDay(addDays(curStart, -7));
      break;
    }
    case 'this-month': {
      curStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      prevEnd = addDays(curStart, -1);
      prevStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      break;
    }
    case 'this-quarter': {
      const q = Math.floor(now.getMonth() / 3);
      curStart = startOfDay(new Date(now.getFullYear(), q * 3, 1));
      prevEnd = addDays(curStart, -1);
      const pq = q === 0 ? 3 : q - 1;
      const py = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
      prevStart = startOfDay(new Date(py, pq * 3, 1));
      break;
    }
    case 'this-year':
    default: {
      curStart = startOfDay(new Date(now.getFullYear(), 0, 1));
      prevEnd = addDays(curStart, -1);
      prevStart = startOfDay(new Date(now.getFullYear() - 1, 0, 1));
      break;
    }
  }
  return { curStart, curEnd, prevStart, prevEnd };
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('es', { month: 'short' }).replace('.', '');
}

function ymKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

async function countNewMembers(
  db: Awaited<ReturnType<typeof getDb>>,
  from: Date,
  to: Date,
  memberTempleMatch: Record<string, unknown> | null
): Promise<number> {
  const window = {
    createdAt: { $gte: from.toISOString(), $lte: to.toISOString() },
  };
  const filter =
    memberTempleMatch === null
      ? window
      : { $and: [window, memberTempleMatch] };
  return db.collection(MEMBERS_COLLECTION).countDocuments(filter);
}

/**
 * `null` = sin filtro (toda la iglesia). Lista vacía = alcance por templos sin miembros coincidentes → 0.
 */
async function countPresentAttendance(
  db: Awaited<ReturnType<typeof getDb>>,
  from: Date,
  to: Date,
  scopedMemberIds: string[] | null
): Promise<number> {
  const a = toYmd(from);
  const b = toYmd(to);
  const base: Record<string, unknown> = {
    status: 'Presente',
    date: { $gte: a, $lte: b },
  };
  if (scopedMemberIds !== null) {
    if (scopedMemberIds.length === 0) {
      return 0;
    }
    base.memberId = { $in: scopedMemberIds };
  }
  return db.collection(MEMBER_ATTENDANCE_COLLECTION).countDocuments(base);
}

async function sumDonations(
  db: Awaited<ReturnType<typeof getDb>>,
  from: Date,
  to: Date,
  churchIds: string[] | null
): Promise<number> {
  const match: Record<string, unknown> = {
    donationDate: { $gte: from.toISOString(), $lte: to.toISOString() },
  };
  if (churchIds && churchIds.length > 0) {
    match.churchId = { $in: churchIds };
  }
  const agg = await db
    .collection(DONATION_COLLECTION)
    .aggregate<{ s: number }>([
      { $match: match },
      { $group: { _id: null, s: { $sum: '$amount' } } },
    ])
    .toArray();
  return agg[0]?.s ?? 0;
}

function emptyDashboardStats(
  monthDefs: { key: string; label: string; end: Date }[]
): DashboardStats {
  const ages: DashboardDemographicSlice[] = [
    { name: '18-25', value: 0, fill: DEMO_FILLS[0]! },
    { name: '26-40', value: 0, fill: DEMO_FILLS[1]! },
    { name: '41-60', value: 0, fill: DEMO_FILLS[2]! },
    { name: '60+', value: 0, fill: DEMO_FILLS[3]! },
  ];
  return {
    members: { total: 0, changePct: null },
    attendance: { total: 0, changePct: null },
    giving: { total: 0, changePct: null },
    eventsThisMonth: 0,
    groups: { totalLabels: 0, activeMembershipHint: 0 },
    ministries: 0,
    volunteers: 0,
    givingByMonth: monthDefs.map(({ label }) => ({
      month: label.charAt(0).toUpperCase() + label.slice(1),
      total: 0,
    })),
    membersByMonth: monthDefs.map(({ label }) => ({
      month: label.charAt(0).toUpperCase() + label.slice(1),
      members: 0,
    })),
    givingTrendPct: null,
    membersTrendPct: null,
    demographics: ages,
    upcomingEvents: [],
    prayerRequests: [],
  };
}

function buildLastNMonthKeys(n: number): { key: string; label: string; end: Date }[] {
  const out: { key: string; label: string; end: Date }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = lastDayOfMonth(d.getFullYear(), d.getMonth());
    out.push({ key: ymKey(d), label: monthLabel(d), end });
  }
  return out;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') ?? 'this-week') as TimeRangeParam;
    const valid: TimeRangeParam[] = ['this-week', 'this-month', 'this-quarter', 'this-year'];
    const r = valid.includes(range) ? range : 'this-week';
    const { curStart, curEnd, prevStart, prevEnd } = periodBounds(r);
    const chartMonthCount = r === 'this-year' ? 12 : r === 'this-quarter' ? 3 : 6;
    const monthDefs = buildLastNMonthKeys(chartMonthCount);

    const db = await getDb();

    let memberTempleMatch: Record<string, unknown> | null = null;
    let scopedMemberIds: string[] | null = null;
    let churchIdsScope: string[] | null = null;

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(emptyDashboardStats(monthDefs));
    }
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? '';
    if (!email) {
      return NextResponse.json(emptyDashboardStats(monthDefs));
    }
    const sessionMember = await db.collection<Record<string, unknown>>('members').findOne(
      { email },
      { projection: { _id: 0, staffRole: 1, churchIds: 1, templeIds: 1 } }
    );
    if (!sessionMember) {
      return NextResponse.json(emptyDashboardStats(monthDefs));
    }

    if (!isFullAccessStaffRole(sessionMember.staffRole as string | null | undefined)) {
      let ids = normalizeMemberChurchIds(sessionMember);
      /** Pastores (`Pastor`, variantes «Pastor …»): mismo alcance que inventario y `resolvePastorChurchAccess`. */
      if (isPastorScopedRole(sessionMember.staffRole as string | null | undefined)) {
        const access = await resolvePastorChurchAccess(db, email);
        if (access.mode === 'none') {
          return NextResponse.json(emptyDashboardStats(monthDefs));
        }
        if (access.mode === 'subset') {
          ids = access.ids;
        }
      }
      if (ids.length === 0) {
        return NextResponse.json(emptyDashboardStats(monthDefs));
      }
      churchIdsScope = ids;
      memberTempleMatch = {
        $or: ids.map((cid) => mongoOrMemberBelongsToChurch(cid)),
      };
      const rows = await db
        .collection(MEMBERS_COLLECTION)
        .find(memberTempleMatch, { projection: { _id: 0, id: 1 } })
        .toArray();
      scopedMemberIds = rows
        .map((row) => String((row as { id?: string }).id ?? '').trim())
        .filter(Boolean);
    }

    const membersCountFilter =
      memberTempleMatch === null ? {} : memberTempleMatch;
    const donationMatchStages: Record<string, unknown>[] = [];
    if (churchIdsScope && churchIdsScope.length > 0) {
      donationMatchStages.push({ $match: { churchId: { $in: churchIdsScope } } });
    }
    donationMatchStages.push({
      $project: {
        ym: { $substr: ['$donationDate', 0, 7] },
        amount: 1,
      },
    });
    donationMatchStages.push({ $group: { _id: '$ym', total: { $sum: '$amount' } } });

    const eventQuery: Record<string, unknown> = {
      eventType: 'event',
      eventStartDate: { $exists: true, $nin: [null, ''] },
    };
    if (churchIdsScope && churchIdsScope.length > 0) {
      eventQuery.churchId = { $in: churchIdsScope };
    }

    const ministryMongoFilter: Record<string, unknown> =
      churchIdsScope && churchIdsScope.length > 0
        ? { churchId: { $in: churchIdsScope } }
        : {};

    const [
      membersTotal,
      membersNewCur,
      membersNewPrev,
      attendCur,
      attendPrev,
      givingCur,
      givingPrev,
      ministriesCount,
      donationByMonthAgg,
      membersProj,
      upcomingRaw,
    ] = await Promise.all([
      db.collection(MEMBERS_COLLECTION).countDocuments(membersCountFilter),
      countNewMembers(db, curStart, curEnd, memberTempleMatch),
      countNewMembers(db, prevStart, prevEnd, memberTempleMatch),
      countPresentAttendance(db, curStart, curEnd, scopedMemberIds),
      countPresentAttendance(db, prevStart, prevEnd, scopedMemberIds),
      sumDonations(db, curStart, curEnd, churchIdsScope),
      sumDonations(db, prevStart, prevEnd, churchIdsScope),
      db.collection(MINISTRIES_COLLECTION).countDocuments(ministryMongoFilter),
      db
        .collection(DONATION_COLLECTION)
        .aggregate<{ _id: string; total: number }>(donationMatchStages)
        .toArray(),
      db
        .collection(MEMBERS_COLLECTION)
        .find(membersCountFilter, {
          projection: { _id: 0, dob: 1, groups: 1, membershipStatus: 1 },
        })
        .toArray(),
      db
        .collection(ATTENDANCE_EVENTS_COLLECTION)
        .find(eventQuery, {
          projection: {
            _id: 0,
            id: 1,
            eventName: 1,
            eventStartDate: 1,
            eventTime: 1,
            notes: 1,
          },
        })
        .toArray(),
    ]);

    const byYm = new Map(donationByMonthAgg.map((x) => [x._id, x.total]));
    const givingByMonth: DashboardChartMonth[] = monthDefs.map(({ key, label }) => ({
      month: label.charAt(0).toUpperCase() + label.slice(1),
      total: Math.round((byYm.get(key) ?? 0) * 100) / 100,
    }));

    const membersByMonth: DashboardChartMonth[] = await Promise.all(
      monthDefs.map(async ({ label, end }) => {
        const createdWindow = { createdAt: { $lte: end.toISOString() } };
        const c = await db.collection(MEMBERS_COLLECTION).countDocuments(
          memberTempleMatch === null
            ? createdWindow
            : { $and: [createdWindow, memberTempleMatch] }
        );
        return {
          month: label.charAt(0).toUpperCase() + label.slice(1),
          members: c,
        };
      })
    );

    const givingTotalsSix = givingByMonth.reduce((a, x) => a + (x.total ?? 0), 0);
    const half = Math.floor(givingByMonth.length / 2) || 1;
    const firstHalf = givingByMonth.slice(0, half).reduce((a, x) => a + (x.total ?? 0), 0);
    const secondHalf = givingByMonth.slice(half).reduce((a, x) => a + (x.total ?? 0), 0);
    const givingTrendPct = pctChange(secondHalf, firstHalf);

    const midIdx = Math.max(0, Math.floor((membersByMonth.length - 1) / 2));
    const midMembers = membersByMonth[midIdx]?.members ?? 0;
    const lastMembers = membersByMonth[membersByMonth.length - 1]?.members ?? 0;
    const membersTrendPct = midMembers > 0 ? pctChange(lastMembers, midMembers) : null;

    const ages: { bucket: string; n: number }[] = [
      { bucket: '18-25', n: 0 },
      { bucket: '26-40', n: 0 },
      { bucket: '41-60', n: 0 },
      { bucket: '60+', n: 0 },
    ];
    const bucketIdx = (age: number) => {
      if (age >= 18 && age <= 25) return 0;
      if (age <= 40) return 1;
      if (age <= 60) return 2;
      return 3;
    };
    for (const m of membersProj) {
      const raw = m.dob;
      if (!raw || typeof raw !== 'string') continue;
      const t = Date.parse(raw);
      if (Number.isNaN(t)) continue;
      const born = new Date(t);
      const today = new Date();
      let age = today.getFullYear() - born.getFullYear();
      const md = today.getMonth() - born.getMonth();
      if (md < 0 || (md === 0 && today.getDate() < born.getDate())) age -= 1;
      if (age < 18) continue;
      const idx = bucketIdx(age);
      if (idx >= 0 && idx < 4) ages[idx].n += 1;
    }
    const demographics: DashboardDemographicSlice[] = ages.map((a, i) => ({
      name: a.bucket,
      value: a.n,
      fill: DEMO_FILLS[i % DEMO_FILLS.length],
    }));

    const groupLabels = new Set<string>();
    let activeInGroups = 0;
    for (const m of membersProj) {
      const status = String(m.membershipStatus ?? '').toLowerCase();
      const groups = Array.isArray(m.groups) ? m.groups : [];
      const labels = groups.map((g) => String(g).trim()).filter(Boolean);
      if (labels.length === 0) continue;
      if (status === 'active') activeInGroups += 1;
      labels.forEach((g) => groupLabels.add(g));
    }

    const ministryDocs = await db
      .collection<MinistryDocument>(MINISTRIES_COLLECTION)
      .find(ministryMongoFilter, { projection: { _id: 0, leaders: 1 } })
      .toArray();
    const leaderEmails = new Set<string>();
    for (const d of ministryDocs) {
      for (const L of d.leaders ?? []) {
        const e = String(L.email ?? '').trim().toLowerCase();
        if (e) leaderEmails.add(e);
      }
    }

    const todayYmd = toYmd(new Date());
    const nowMs = Date.now();
    const monthStart = startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const monthEnd = lastDayOfMonth(new Date().getFullYear(), new Date().getMonth());
    const monthStartStr = toYmd(monthStart);
    const monthEndStr = toYmd(monthEnd);

    const upcomingEvents: DashboardUpcomingEvent[] = upcomingRaw
      .map((doc) => {
        const raw = doc as Record<string, unknown>;
        const id = typeof raw.id === 'string' ? raw.id : '';
        const title = typeof raw.eventName === 'string' ? raw.eventName : 'Evento';
        const start = typeof raw.eventStartDate === 'string' ? raw.eventStartDate : '';
        const time = typeof raw.eventTime === 'string' ? raw.eventTime : '';
        const location = typeof raw.notes === 'string' ? raw.notes : '';
        return { id, title, start, time, location };
      })
      .filter((e) => e.start >= todayYmd)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 8)
      .map((e) => {
        const [y, m, d] = e.start.split('-').map(Number);
        const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
        const month = dt.toLocaleDateString('es', { month: 'short' }).replace('.', '').toUpperCase();
        const day = String(d ?? '');
        return {
          id: e.id,
          title: e.title,
          dateParts: { month, day },
          time: e.time,
          location: e.location,
          sortKey: e.start,
        };
      });

    let eventsThisMonth = 0;
    for (const row of upcomingRaw) {
      const raw = row as Record<string, unknown>;
      const start = typeof raw.eventStartDate === 'string' ? raw.eventStartDate : '';
      if (start.length >= 10 && start >= monthStartStr && start <= monthEndStr) {
        eventsThisMonth += 1;
      }
    }

    let prayerRequests: DashboardPrayerItem[] = [];
    for (const col of ['prayer_requests', 'prayer']) {
      try {
        const exists = await db.listCollections({ name: col }, { nameOnly: true }).toArray();
        if (exists.length === 0) continue;
        const prayerFilter: Record<string, unknown> =
          churchIdsScope && churchIdsScope.length > 0
            ? { churchId: { $in: churchIdsScope } }
            : {};
        const docs = await db
          .collection(col)
          .find(prayerFilter)
          .sort({ createdAt: -1 })
          .limit(5)
          .project({ _id: 0 })
          .toArray();
        prayerRequests = docs.map((d, i) => {
          const o = d as Record<string, unknown>;
          const id = typeof o.id === 'string' ? o.id : `p-${i}`;
          const request =
            typeof o.title === 'string'
              ? o.title
              : typeof o.request === 'string'
                ? o.request
                : typeof o.message === 'string'
                  ? o.message
                  : 'Petición';
          let submitted = 'Reciente';
          const cAt = o.createdAt ?? o.submittedAt;
          if (typeof cAt === 'string') {
            const diff = Math.max(0, Math.floor((nowMs - Date.parse(cAt)) / 86400000));
            submitted =
              diff === 0
                ? 'Enviado hoy'
                : diff === 1
                  ? 'Enviado hace 1 día'
                  : `Enviado hace ${diff} días`;
          }
          return { id, request, submitted };
        });
        if (prayerRequests.length > 0) break;
      } catch {
        /* vacío */
      }
    }

    const stats: DashboardStats = {
      members: { total: membersTotal, changePct: pctChange(membersNewCur, membersNewPrev) },
      attendance: { total: attendCur, changePct: pctChange(attendCur, attendPrev) },
      giving: { total: givingCur, changePct: pctChange(givingCur, givingPrev) },
      eventsThisMonth,
      groups: {
        totalLabels: groupLabels.size,
        activeMembershipHint: activeInGroups,
      },
      ministries: ministriesCount,
      volunteers: leaderEmails.size,
      givingByMonth,
      membersByMonth,
      givingTrendPct,
      membersTrendPct,
      demographics,
      upcomingEvents,
      prayerRequests,
    };

    return NextResponse.json(stats);
  } catch (e) {
    console.error('[api/dashboard GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al cargar el panel.' },
      { status: 500 }
    );
  }
}
