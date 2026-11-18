import {
  collection,
  deleteDoc,
  doc,
  getDocsFromCache,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  VALIDATION_LIMITS,
  type DutyEntry,
  type DutyFormInput,
  type KarmchariProfile,
  type LeaveEntry,
  type LeaveType,
  type ProfileFormInput,
  type PublicHolidayEntry,
  type WeeklyOffDay,
  type WeeklyOffEntry,
} from '../types/diary';

import { translations, type Language } from './i18n';

function clampString(value: string, max: number): string {
  return value.trim().slice(0, max);
}

export function validateProfileInput(input: ProfileFormInput, lang: Language = 'mr'): string | null {
  const t = translations[lang];
  const name = input.karmchariName.trim();
  if (name.length < VALIDATION_LIMITS.karmchariName.minLength) {
    return t.valNameMin;
  }
  if (!input.badgeNumber.trim()) return t.valBadgeReq;
  if (!input.depoName.trim()) return t.valDepoReq;
  if (!input.divisionName.trim()) return t.valDivisionReq;
  const mobile = input.mobileNumber.trim();
  if (!VALIDATION_LIMITS.mobileNumber.pattern.test(mobile)) {
    return t.valMobileInvalid;
  }
  if (!VALIDATION_LIMITS.dateOfBirth.pattern.test(input.dateOfBirth)) {
    return t.valDobInvalid;
  }
  if (input.photoDataUrl.length > VALIDATION_LIMITS.photoDataUrl.maxLength) {
    return t.valPhotoTooLarge;
  }
  return null;
}

export function validateDutyInput(input: DutyFormInput, lang: Language = 'mr'): string | null {
  const t = translations[lang];
  if (!VALIDATION_LIMITS.dutyDate.pattern.test(input.dutyDate)) {
    return t.valDutyDateInvalid;
  }
  if (!input.dutyNumber.trim()) return t.valDutyNumReq;
  if (!input.dutyRouteName.trim()) return t.valRouteReq;
  if (!input.busNumber.trim()) return t.valBusNumReq;
  if (!input.crewName.trim()) return t.valCrewNameReq;
  if (!input.crewBadgeNumber.trim()) return t.valCrewBadgeReq;
  const start = (input.dutyStartTime || '').trim();
  const end = (input.dutyEndTime || '').trim();
  if (
    !VALIDATION_LIMITS.dutyTime.pattern.test(start) ||
    !VALIDATION_LIMITS.dutyTime.pattern.test(end)
  ) {
    return t.valDutyTimeInvalid;
  }
  if (start && end && start === end) {
    return t.valDutyTimeSame;
  }
  return null;
}

export function subscribeToProfile(
  uid: string,
  onData: (profile: KarmchariProfile | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = `profiles/${uid}`;
  const ref = doc(db, 'profiles', uid);
  return onSnapshot(
    ref,
    { includeMetadataChanges: true },
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const data = snap.data() as KarmchariProfile;
      const localDay = getLocalWeeklyOffDay(uid);
      const hasPendingLocalOff = isLocalWeeklyOffPending(uid);
      const resolvedWeeklyOff = hasPendingLocalOff
        ? localDay
        : data.weeklyOffDay || localDay;

      if (!hasPendingLocalOff && data.weeklyOffDay) {
        try {
          localStorage.setItem(`bus_diary_fixed_off_${uid}`, data.weeklyOffDay);
        } catch {
          // Ignore storage errors
        }
      }

      onData({
        ...data,
        weeklyOffDay: resolvedWeeklyOff,
        hasPendingWrites: snap.metadata.hasPendingWrites || hasPendingLocalOff,
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function saveProfile(
  uid: string,
  input: ProfileFormInput,
  isExistingProfile: boolean
): Promise<void> {
  const path = `profiles/${uid}`;
  const ref = doc(db, 'profiles', uid);
  const sanitized = {
    karmchariName: clampString(input.karmchariName, VALIDATION_LIMITS.karmchariName.maxLength),
    post: input.post,
    badgeNumber: clampString(input.badgeNumber, VALIDATION_LIMITS.badgeNumber.maxLength),
    depoName: clampString(input.depoName, VALIDATION_LIMITS.depoName.maxLength),
    divisionName: clampString(input.divisionName, VALIDATION_LIMITS.divisionName.maxLength),
    mobileNumber: clampString(input.mobileNumber, VALIDATION_LIMITS.mobileNumber.maxLength),
    email: clampString(input.email, VALIDATION_LIMITS.email.maxLength),
    dateOfBirth: input.dateOfBirth,
    photoDataUrl: input.photoDataUrl.slice(0, VALIDATION_LIMITS.photoDataUrl.maxLength),
    weeklyOffDay: input.weeklyOffDay || 'none',
  };

  try {
    localStorage.setItem(`bus_diary_fixed_off_${uid}`, sanitized.weeklyOffDay);
  } catch {
    // Ignore storage errors
  }

  try {
    if (isExistingProfile) {
      await updateDoc(ref, {
        ...sanitized,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ownerId: uid,
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    try {
      localStorage.removeItem(`bus_diary_fixed_off_pending_${uid}`);
    } catch {
      // Ignore storage errors
    }
  } catch (error) {
    handleFirestoreError(error, isExistingProfile ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export function getLocalWeeklyOffDay(uid: string): WeeklyOffDay {
  try {
    const val = localStorage.getItem(`bus_diary_fixed_off_${uid}`);
    if (val && ['none', '0', '1', '2', '3', '4', '5', '6'].includes(val)) {
      return val as WeeklyOffDay;
    }
  } catch {
    // Ignore storage errors
  }
  return 'none';
}

export function getLocalWeeklyOffLocked(uid: string): boolean {
  try {
    localStorage.removeItem(`bus_diary_fixed_off_locked_${uid}`);
    return localStorage.getItem(`bus_diary_fixed_off_locked_v2_${uid}`) === '1';
  } catch {
    return false;
  }
}

export function setLocalWeeklyOffLocked(uid: string, locked: boolean): void {
  try {
    localStorage.removeItem(`bus_diary_fixed_off_locked_${uid}`);
    localStorage.setItem(`bus_diary_fixed_off_locked_v2_${uid}`, locked ? '1' : '0');
  } catch {
    // Ignore storage errors
  }
}

export function getLocalPublicHolidayLocked(uid: string): boolean {
  try {
    return localStorage.getItem(`bus_diary_public_holiday_locked_${uid}`) === '1';
  } catch {
    return false;
  }
}

export function setLocalPublicHolidayLocked(uid: string, locked: boolean): void {
  try {
    localStorage.setItem(`bus_diary_public_holiday_locked_${uid}`, locked ? '1' : '0');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('bus-diary-holiday-lock-changed', {
          detail: { uid, locked },
        })
      );
    }
  } catch {
    // Ignore storage errors
  }
}

export interface CachedAuthSession {
  uid: string;
  email: string;
}

export function getCachedAuthSession(): CachedAuthSession | null {
  try {
    const raw = localStorage.getItem('bus_diary_cached_auth_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedAuthSession>;
    if (parsed && typeof parsed.uid === 'string' && parsed.uid) {
      return { uid: parsed.uid, email: typeof parsed.email === 'string' ? parsed.email : '' };
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

export function setCachedAuthSession(session: CachedAuthSession | null): void {
  try {
    if (session) {
      localStorage.setItem('bus_diary_cached_auth_user', JSON.stringify(session));
    } else {
      localStorage.removeItem('bus_diary_cached_auth_user');
    }
  } catch {
    // Ignore storage errors
  }
}

function isLocalWeeklyOffPending(uid: string): boolean {
  try {
    return localStorage.getItem(`bus_diary_fixed_off_pending_${uid}`) === '1';
  } catch {
    return false;
  }
}

export async function updateWeeklyOffDay(
  uid: string,
  weeklyOffDay: WeeklyOffDay,
  hasExistingProfile: boolean
): Promise<void> {
  try {
    localStorage.setItem(`bus_diary_fixed_off_${uid}`, weeklyOffDay);
    localStorage.setItem(`bus_diary_fixed_off_pending_${uid}`, '1');
  } catch {
    // Ignore storage errors
  }

  if (!hasExistingProfile) {
    return;
  }

  try {
    await updateDoc(doc(db, 'profiles', uid), {
      weeklyOffDay,
      updatedAt: serverTimestamp(),
    });
    try {
      localStorage.removeItem(`bus_diary_fixed_off_pending_${uid}`);
    } catch {
      // Ignore storage errors
    }
  } catch (error) {
    // Keep local selection active offline or if profile fields still need completion
    console.warn('Could not sync weeklyOffDay to Firestore profile yet:', error);
  }
}

export function subscribeToDuties(
  uid: string,
  onData: (duties: DutyEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = 'duties';
  const q = query(
    collection(db, 'duties'),
    where('ownerId', '==', uid)
  );

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const items: DutyEntry[] = snapshot.docs.map((d) => {
        const data = d.data() as Omit<DutyEntry, 'id' | 'hasPendingWrites'>;
        return {
          ...data,
          dutyStartTime: data.dutyStartTime || '',
          dutyEndTime: data.dutyEndTime || '',
          id: d.id,
          hasPendingWrites: d.metadata.hasPendingWrites,
        };
      });
      items.sort((a, b) => {
        if (a.dutyDate !== b.dutyDate) {
          return b.dutyDate.localeCompare(a.dutyDate);
        }
        return b.id.localeCompare(a.id);
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

function generateDutyId(dutyDate: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return `duty_${dutyDate.replace(/-/g, '')}_${ts}_${random}`;
}

export async function createDutyEntry(uid: string, input: DutyFormInput): Promise<string> {
  const id = generateDutyId(input.dutyDate);
  const path = `duties/${id}`;
  const dutyYear = input.dutyDate.slice(0, 4);
  const dutyMonth = input.dutyDate.slice(0, 7);

  const payload = {
    ownerId: uid,
    dutyDate: input.dutyDate,
    dutyYear,
    dutyMonth,
    dutyNumber: clampString(input.dutyNumber, VALIDATION_LIMITS.dutyNumber.maxLength),
    dutyRouteName: clampString(input.dutyRouteName, VALIDATION_LIMITS.dutyRouteName.maxLength),
    busNumber: clampString(input.busNumber, VALIDATION_LIMITS.busNumber.maxLength).toUpperCase(),
    crewPost: input.crewPost,
    crewName: clampString(input.crewName, VALIDATION_LIMITS.crewName.maxLength),
    crewBadgeNumber: clampString(input.crewBadgeNumber, VALIDATION_LIMITS.crewBadgeNumber.maxLength),
    dutyStartTime: clampString(input.dutyStartTime || '', VALIDATION_LIMITS.dutyTime.maxLength),
    dutyEndTime: clampString(input.dutyEndTime || '', VALIDATION_LIMITS.dutyTime.maxLength),
    remark: clampString(input.remark, VALIDATION_LIMITS.remark.maxLength),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'duties', id), payload);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateDutyEntry(id: string, input: DutyFormInput): Promise<void> {
  const path = `duties/${id}`;
  const dutyYear = input.dutyDate.slice(0, 4);
  const dutyMonth = input.dutyDate.slice(0, 7);

  const payload = {
    dutyDate: input.dutyDate,
    dutyYear,
    dutyMonth,
    dutyNumber: clampString(input.dutyNumber, VALIDATION_LIMITS.dutyNumber.maxLength),
    dutyRouteName: clampString(input.dutyRouteName, VALIDATION_LIMITS.dutyRouteName.maxLength),
    busNumber: clampString(input.busNumber, VALIDATION_LIMITS.busNumber.maxLength).toUpperCase(),
    crewPost: input.crewPost,
    crewName: clampString(input.crewName, VALIDATION_LIMITS.crewName.maxLength),
    crewBadgeNumber: clampString(input.crewBadgeNumber, VALIDATION_LIMITS.crewBadgeNumber.maxLength),
    dutyStartTime: clampString(input.dutyStartTime || '', VALIDATION_LIMITS.dutyTime.maxLength),
    dutyEndTime: clampString(input.dutyEndTime || '', VALIDATION_LIMITS.dutyTime.maxLength),
    remark: clampString(input.remark, VALIDATION_LIMITS.remark.maxLength),
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(doc(db, 'duties', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDutyEntry(id: string): Promise<void> {
  const path = `duties/${id}`;
  try {
    await deleteDoc(doc(db, 'duties', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToWeeklyOffs(
  uid: string,
  onData: (offs: WeeklyOffEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = 'weeklyOffs';
  const q = query(collection(db, 'weeklyOffs'), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const items: WeeklyOffEntry[] = snapshot.docs.map((d) => {
        const data = d.data() as Omit<WeeklyOffEntry, 'id' | 'hasPendingWrites'>;
        return {
          ...data,
          id: d.id,
          hasPendingWrites: d.metadata.hasPendingWrites,
        };
      });
      items.sort((a, b) => b.offDate.localeCompare(a.offDate));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function setWeeklyOffForDate(
  uid: string,
  offDate: string,
  note = '',
  isExisting = false
): Promise<void> {
  const id = `off_${uid}_${offDate.replace(/-/g, '')}`;
  const path = `weeklyOffs/${id}`;
  const offYear = offDate.slice(0, 4);
  const offMonth = offDate.slice(0, 7);
  const cleanNote = clampString(note, 200);

  try {
    if (isExisting) {
      await updateDoc(doc(db, 'weeklyOffs', id), {
        offDate,
        offYear,
        offMonth,
        note: cleanNote,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'weeklyOffs', id), {
        ownerId: uid,
        offDate,
        offYear,
        offMonth,
        note: cleanNote,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isExisting ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function removeWeeklyOff(id: string): Promise<void> {
  const path = `weeklyOffs/${id}`;
  try {
    await deleteDoc(doc(db, 'weeklyOffs', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToLeaves(
  uid: string,
  onData: (leaves: LeaveEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = 'leaves';
  const q = query(collection(db, 'leaves'), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const items: LeaveEntry[] = snapshot.docs.map((d) => {
        const data = d.data() as Omit<LeaveEntry, 'id' | 'hasPendingWrites'>;
        return {
          ...data,
          id: d.id,
          hasPendingWrites: d.metadata.hasPendingWrites,
        };
      });
      items.sort((a, b) => b.leaveDate.localeCompare(a.leaveDate));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function setLeaveForDate(
  uid: string,
  leaveDate: string,
  leaveType: LeaveType,
  note = '',
  isExisting = false
): Promise<void> {
  // Defense-in-depth: never allow submitting a Leave / C-Off / PH on a date with a logged duty
  try {
    const cachedDuties = await getDocsFromCache(
      query(collection(db, 'duties'), where('ownerId', '==', uid))
    );
    const hasDutyOnDate = cachedDuties.docs.some(
      (d) => (d.data() as { dutyDate?: string }).dutyDate === leaveDate
    );
    if (hasDutyOnDate) {
      throw new Error('Cannot submit Leave / C-Off / PH on a date where duty is logged.');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('duty is logged')) {
      throw err;
    }
  }

  const id = `leave_${uid}_${leaveDate.replace(/-/g, '')}`;
  const path = `leaves/${id}`;
  const leaveYear = leaveDate.slice(0, 4);
  const leaveMonth = leaveDate.slice(0, 7);
  const cleanNote = clampString(note, VALIDATION_LIMITS.leaveNote.maxLength);

  try {
    if (isExisting) {
      await updateDoc(doc(db, 'leaves', id), {
        leaveDate,
        leaveYear,
        leaveMonth,
        leaveType,
        note: cleanNote,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'leaves', id), {
        ownerId: uid,
        leaveDate,
        leaveYear,
        leaveMonth,
        leaveType,
        note: cleanNote,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isExisting ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function removeLeave(id: string): Promise<void> {
  const path = `leaves/${id}`;
  try {
    await deleteDoc(doc(db, 'leaves', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToPublicHolidays(
  uid: string,
  onData: (holidays: PublicHolidayEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const path = 'publicHolidays';
  const q = query(collection(db, 'publicHolidays'), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const items: PublicHolidayEntry[] = snapshot.docs.map((d) => {
        const data = d.data() as Omit<PublicHolidayEntry, 'id' | 'hasPendingWrites'>;
        return {
          ...data,
          id: d.id,
          hasPendingWrites: d.metadata.hasPendingWrites,
        };
      });
      items.sort((a, b) => b.holidayDate.localeCompare(a.holidayDate));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function setPublicHolidayForDate(
  uid: string,
  holidayDate: string,
  holidayName: string,
  hasExistingDoc: boolean
): Promise<void> {
  const id = `holiday_${uid}_${holidayDate.replace(/-/g, '')}`;
  const path = `publicHolidays/${id}`;
  const holidayYear = holidayDate.slice(0, 4);
  const holidayMonth = holidayDate.slice(0, 7);
  const cleanName = clampString(holidayName, VALIDATION_LIMITS.holidayName.maxLength);
  if (!cleanName) return;

  try {
    if (hasExistingDoc) {
      await updateDoc(doc(db, 'publicHolidays', id), {
        holidayDate,
        holidayYear,
        holidayMonth,
        holidayName: cleanName,
        status: 'active',
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'publicHolidays', id), {
        ownerId: uid,
        holidayDate,
        holidayYear,
        holidayMonth,
        holidayName: cleanName,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, hasExistingDoc ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function removePublicHolidayForDate(
  uid: string,
  holidayDate: string,
  isBuiltIn: boolean,
  hasExistingDoc: boolean
): Promise<void> {
  const id = `holiday_${uid}_${holidayDate.replace(/-/g, '')}`;
  const path = `publicHolidays/${id}`;
  const holidayYear = holidayDate.slice(0, 4);
  const holidayMonth = holidayDate.slice(0, 7);

  try {
    if (!isBuiltIn && hasExistingDoc) {
      await deleteDoc(doc(db, 'publicHolidays', id));
    } else if (hasExistingDoc) {
      await updateDoc(doc(db, 'publicHolidays', id), {
        holidayDate,
        holidayYear,
        holidayMonth,
        holidayName: 'Removed',
        status: 'removed',
        updatedAt: serverTimestamp(),
      });
    } else if (isBuiltIn) {
      await setDoc(doc(db, 'publicHolidays', id), {
        ownerId: uid,
        holidayDate,
        holidayYear,
        holidayMonth,
        holidayName: 'Removed',
        status: 'removed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      !isBuiltIn && hasExistingDoc
        ? OperationType.DELETE
        : hasExistingDoc
        ? OperationType.UPDATE
        : OperationType.CREATE,
      path
    );
  }
}
