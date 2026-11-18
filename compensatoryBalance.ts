import type {
  DutyEntry,
  LeaveEntry,
  ResolvedPublicHoliday,
  WeeklyOffDay,
} from '../types/diary';

export interface CompensatoryBalanceSummary {
  earnedCOffDates: string[];
  usedCOffDates: string[];
  earnedCOffCount: number;
  usedCOffCount: number;
  remainingCOff: number;
  earnedPhDates: string[];
  usedPhDates: string[];
  earnedPhCount: number;
  usedPhCount: number;
  remainingPh: number;
}

export interface CompensatoryPeriodSlice {
  earnedCOffDates: string[];
  usedCOffDates: string[];
  earnedCOffCount: number;
  usedCOffCount: number;
  earnedPhDates: string[];
  usedPhDates: string[];
  earnedPhCount: number;
  usedPhCount: number;
}

export function getIsoWeekdayIndex(isoDate: string): string {
  const dt = new Date(`${isoDate}T12:00:00`);
  return Number.isNaN(dt.getTime()) ? '' : String(dt.getDay());
}

export function isDateFixedWeeklyOff(
  isoDate: string,
  fixedWeeklyOffDay: WeeklyOffDay
): boolean {
  if (fixedWeeklyOffDay === 'none') return false;
  return getIsoWeekdayIndex(isoDate) === fixedWeeklyOffDay;
}

export function isDatePublicHoliday(
  isoDate: string,
  holidayMap: Map<string, ResolvedPublicHoliday>
): boolean {
  return holidayMap.has(isoDate);
}

export function computeCompensatoryBalances(
  duties: DutyEntry[],
  leaves: LeaveEntry[],
  fixedWeeklyOffDay: WeeklyOffDay,
  holidayMap: Map<string, ResolvedPublicHoliday>
): CompensatoryBalanceSummary {
  const earnedCOffSet = new Set<string>();
  const earnedPhSet = new Set<string>();

  for (const duty of duties) {
    if (isDateFixedWeeklyOff(duty.dutyDate, fixedWeeklyOffDay)) {
      earnedCOffSet.add(duty.dutyDate);
    }
    if (isDatePublicHoliday(duty.dutyDate, holidayMap)) {
      earnedPhSet.add(duty.dutyDate);
    }
  }

  const usedCOffSet = new Set<string>();
  const usedPhSet = new Set<string>();

  for (const leave of leaves) {
    if (leave.leaveType === 'COFF') {
      usedCOffSet.add(leave.leaveDate);
    } else if (leave.leaveType === 'PH') {
      usedPhSet.add(leave.leaveDate);
    }
  }

  const sortDesc = (a: string, b: string) => b.localeCompare(a);
  const earnedCOffDates = Array.from(earnedCOffSet).sort(sortDesc);
  const usedCOffDates = Array.from(usedCOffSet).sort(sortDesc);
  const earnedPhDates = Array.from(earnedPhSet).sort(sortDesc);
  const usedPhDates = Array.from(usedPhSet).sort(sortDesc);

  return {
    earnedCOffDates,
    usedCOffDates,
    earnedCOffCount: earnedCOffDates.length,
    usedCOffCount: usedCOffDates.length,
    remainingCOff: earnedCOffDates.length - usedCOffDates.length,
    earnedPhDates,
    usedPhDates,
    earnedPhCount: earnedPhDates.length,
    usedPhCount: usedPhDates.length,
    remainingPh: earnedPhDates.length - usedPhDates.length,
  };
}

export function sliceCompensatoryByPrefix(
  summary: CompensatoryBalanceSummary,
  datePrefix: string
): CompensatoryPeriodSlice {
  const earnedCOffDates = summary.earnedCOffDates.filter((d) => d.startsWith(datePrefix));
  const usedCOffDates = summary.usedCOffDates.filter((d) => d.startsWith(datePrefix));
  const earnedPhDates = summary.earnedPhDates.filter((d) => d.startsWith(datePrefix));
  const usedPhDates = summary.usedPhDates.filter((d) => d.startsWith(datePrefix));

  return {
    earnedCOffDates,
    usedCOffDates,
    earnedCOffCount: earnedCOffDates.length,
    usedCOffCount: usedCOffDates.length,
    earnedPhDates,
    usedPhDates,
    earnedPhCount: earnedPhDates.length,
    usedPhCount: usedPhDates.length,
  };
}

export type CompensatorySpendType = 'COFF' | 'PH';

export type CompensatorySpendBlockReason =
  | 'invalid-date'
  | 'duty-exists'
  | 'past-date'
  | 'before-earned'
  | 'weekly-off'
  | 'public-holiday'
  | 'existing-leave'
  | 'no-balance';

export interface CompensatorySpendValidation {
  valid: boolean;
  reason: CompensatorySpendBlockReason | null;
}

export function getLocalTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function validateCompensatorySpendDate(params: {
  spendDate: string;
  spendType: CompensatorySpendType;
  todayIso: string;
  fixedWeeklyOffDay: WeeklyOffDay;
  holidayMap: Map<string, ResolvedPublicHoliday>;
  leaves: LeaveEntry[];
  duties?: DutyEntry[];
  compBalance: CompensatoryBalanceSummary;
}): CompensatorySpendValidation {
  const {
    spendDate,
    spendType,
    todayIso,
    fixedWeeklyOffDay,
    holidayMap,
    leaves,
    duties = [],
    compBalance,
  } = params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(spendDate)) {
    return { valid: false, reason: 'invalid-date' };
  }

  // Cannot take C-Off / Leave / PH on a day where a duty is logged
  if (duties.some((d) => d.dutyDate === spendDate)) {
    return { valid: false, reason: 'duty-exists' };
  }

  // Cannot spend on a past / back date (only same day today or forward)
  if (spendDate < todayIso) {
    return { valid: false, reason: 'past-date' };
  }

  // Cannot spend on a holiday: Fixed Weekly Off or Public Holiday
  if (isDateFixedWeeklyOff(spendDate, fixedWeeklyOffDay)) {
    return { valid: false, reason: 'weekly-off' };
  }

  if (isDatePublicHoliday(spendDate, holidayMap)) {
    return { valid: false, reason: 'public-holiday' };
  }

  // Cannot spend on a day that already has another Leave marked
  const existingLeave = leaves.find((l) => l.leaveDate === spendDate);
  if (existingLeave && existingLeave.leaveType !== spendType) {
    return { valid: false, reason: 'existing-leave' };
  }

  const isAlreadySameSpendType = existingLeave?.leaveType === spendType;
  const remaining =
    spendType === 'COFF' ? compBalance.remainingCOff : compBalance.remainingPh;

  if (!isAlreadySameSpendType && remaining <= 0) {
    return { valid: false, reason: 'no-balance' };
  }

  // Also ensure at least one earned day exists on or before spendDate
  // (so a future-logged Weekly Off / Holiday duty cannot be spent before that earned date)
  const earnedDates =
    spendType === 'COFF' ? compBalance.earnedCOffDates : compBalance.earnedPhDates;
  const usedDates =
    spendType === 'COFF' ? compBalance.usedCOffDates : compBalance.usedPhDates;

  const earnedUpToDate = earnedDates.filter((d) => d <= spendDate).length;
  const usedUpToDateExcludingTarget = usedDates.filter(
    (d) => d <= spendDate && d !== spendDate
  ).length;

  if (earnedUpToDate - usedUpToDateExcludingTarget <= 0) {
    return { valid: false, reason: 'before-earned' };
  }

  return { valid: true, reason: null };
}

export function findNextValidCompensatoryDate(params: {
  startIso: string;
  spendType: CompensatorySpendType;
  fixedWeeklyOffDay: WeeklyOffDay;
  holidayMap: Map<string, ResolvedPublicHoliday>;
  leaves: LeaveEntry[];
  duties?: DutyEntry[];
}): string {
  const { startIso, spendType, fixedWeeklyOffDay, holidayMap, leaves, duties = [] } = params;
  const base = new Date(`${startIso}T12:00:00`);
  if (Number.isNaN(base.getTime())) return startIso;

  for (let offset = 0; offset < 90; offset += 1) {
    const dt = new Date(base);
    dt.setDate(base.getDate() + offset);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const candidate = `${y}-${m}-${d}`;

    if (duties.some((duty) => duty.dutyDate === candidate)) continue;
    if (isDateFixedWeeklyOff(candidate, fixedWeeklyOffDay)) continue;
    if (isDatePublicHoliday(candidate, holidayMap)) continue;
    const existingLeave = leaves.find((l) => l.leaveDate === candidate);
    if (existingLeave && existingLeave.leaveType !== spendType) continue;
    return candidate;
  }

  return startIso;
}
