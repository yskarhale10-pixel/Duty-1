export type KarmchariPost = 'Driver' | 'Conductor';
export type WeeklyOffDay = 'none' | '0' | '1' | '2' | '3' | '4' | '5' | '6';
export type LeaveType = 'CL' | 'EL' | 'ML' | 'COFF' | 'PH' | 'Other';
export type PublicHolidayStatus = 'active' | 'removed';

export interface KarmchariProfile {
  ownerId: string;
  karmchariName: string;
  post: KarmchariPost;
  badgeNumber: string;
  depoName: string;
  divisionName: string;
  mobileNumber: string;
  email: string;
  dateOfBirth: string;
  photoDataUrl: string;
  weeklyOffDay?: WeeklyOffDay;
  createdAt?: unknown;
  updatedAt?: unknown;
  hasPendingWrites?: boolean;
}

export interface DutyEntry {
  id: string;
  ownerId: string;
  dutyDate: string; // YYYY-MM-DD
  dutyYear: string; // YYYY
  dutyMonth: string; // YYYY-MM
  dutyNumber: string;
  dutyRouteName: string;
  busNumber: string;
  crewPost: KarmchariPost;
  crewName: string;
  crewBadgeNumber: string;
  dutyStartTime?: string; // HH:MM (24h) or ''
  dutyEndTime?: string; // HH:MM (24h) or ''
  remark: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  hasPendingWrites?: boolean;
}

export interface WeeklyOffEntry {
  id: string;
  ownerId: string;
  offDate: string; // YYYY-MM-DD
  offYear: string; // YYYY
  offMonth: string; // YYYY-MM
  note: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  hasPendingWrites?: boolean;
}

export interface LeaveEntry {
  id: string;
  ownerId: string;
  leaveDate: string; // YYYY-MM-DD
  leaveYear: string; // YYYY
  leaveMonth: string; // YYYY-MM
  leaveType: LeaveType;
  note: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  hasPendingWrites?: boolean;
}

export interface PublicHolidayEntry {
  id: string;
  ownerId: string;
  holidayDate: string; // YYYY-MM-DD
  holidayYear: string; // YYYY
  holidayMonth: string; // YYYY-MM
  holidayName: string;
  status: PublicHolidayStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
  hasPendingWrites?: boolean;
}

export interface ResolvedPublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  source: 'builtin' | 'custom';
  customEntry?: PublicHolidayEntry;
}

export type DutyFormInput = Omit<DutyEntry, 'id' | 'ownerId' | 'dutyYear' | 'dutyMonth' | 'createdAt' | 'updatedAt' | 'hasPendingWrites'>;
export type ProfileFormInput = Omit<KarmchariProfile, 'ownerId' | 'createdAt' | 'updatedAt' | 'hasPendingWrites'>;

// Verbatim validation bounds synchronized with firebase-blueprint.json & firestore.rules
export const VALIDATION_LIMITS = {
  ownerId: { minLength: 1, maxLength: 128, pattern: /^[a-zA-Z0-9_-]+$/ },
  karmchariName: { minLength: 2, maxLength: 100 },
  badgeNumber: { minLength: 1, maxLength: 32 },
  depoName: { minLength: 1, maxLength: 80 },
  divisionName: { minLength: 1, maxLength: 80 },
  mobileNumber: { minLength: 7, maxLength: 20, pattern: /^[0-9+\-\s]{7,20}$/ },
  email: { minLength: 3, maxLength: 120 },
  dateOfBirth: { length: 10, pattern: /^\d{4}-\d{2}-\d{2}$/ },
  photoDataUrl: { maxLength: 120000 },
  dutyDate: { length: 10, pattern: /^\d{4}-\d{2}-\d{2}$/ },
  dutyYear: { length: 4, pattern: /^\d{4}$/ },
  dutyMonth: { length: 7, pattern: /^\d{4}-\d{2}$/ },
  dutyNumber: { minLength: 1, maxLength: 40 },
  dutyRouteName: { minLength: 1, maxLength: 120 },
  busNumber: { minLength: 1, maxLength: 40 },
  crewName: { minLength: 1, maxLength: 100 },
  crewBadgeNumber: { minLength: 1, maxLength: 32 },
  dutyTime: { maxLength: 5, pattern: /^(|([01]\d|2[0-3]):[0-5]\d)$/ },
  remark: { maxLength: 500 },
  leaveNote: { maxLength: 200 },
  holidayName: { minLength: 1, maxLength: 120 },
} as const;
