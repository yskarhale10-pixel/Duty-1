import type { Language } from './i18n';

export const DUTY_TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidDutyTimeFormat(value?: string): boolean {
  if (!value) return true;
  return DUTY_TIME_REGEX.test(value.trim());
}

export function computeDutyDurationMinutes(
  startTime?: string,
  endTime?: string
): number | null {
  const s = (startTime || '').trim();
  const e = (endTime || '').trim();
  if (!s || !e || !DUTY_TIME_REGEX.test(s) || !DUTY_TIME_REGEX.test(e)) {
    return null;
  }
  const [sh, sm] = s.split(':').map(Number);
  const [eh, em] = e.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (endMin === startMin) return 0;
  return endMin > startMin ? endMin - startMin : 24 * 60 - startMin + endMin;
}

export function isOvernightShift(startTime?: string, endTime?: string): boolean {
  const s = (startTime || '').trim();
  const e = (endTime || '').trim();
  if (!s || !e || !DUTY_TIME_REGEX.test(s) || !DUTY_TIME_REGEX.test(e)) {
    return false;
  }
  const [sh, sm] = s.split(':').map(Number);
  const [eh, em] = e.split(':').map(Number);
  return eh * 60 + em < sh * 60 + sm;
}

export function formatDurationLabel(minutes: number, lang: Language): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (lang === 'mr') {
    if (hrs > 0 && mins > 0) return `${hrs} तास ${mins} मि.`;
    if (hrs > 0) return `${hrs} तास`;
    return `${mins} मि.`;
  }
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export function formatDutyTimeRange(
  startTime?: string,
  endTime?: string,
  lang?: Language
): string {
  const s = (startTime || '').trim();
  const e = (endTime || '').trim();
  if (!s && !e) return '';
  if (s && e) {
    const mins = computeDutyDurationMinutes(s, e);
    if (mins && mins > 0 && lang) {
      return `${s} – ${e} (${formatDurationLabel(mins, lang)})`;
    }
    return `${s} – ${e}`;
  }
  if (s) return `${s} – ...`;
  return `... – ${e}`;
}
