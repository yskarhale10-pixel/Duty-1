import type { Language } from './i18n';
import type { PublicHolidayEntry, ResolvedPublicHoliday } from '../types/diary';

interface BuiltInHoliday {
  date: string; // YYYY-MM-DD
  nameMr: string;
  nameEn: string;
}

// Major National & Maharashtra Public Holidays (2024-2028)
export const BUILT_IN_PUBLIC_HOLIDAYS: BuiltInHoliday[] = [
  // Fixed annual national / Maharashtra public holidays for 2024-2028
  ...[2024, 2025, 2026, 2027, 2028].flatMap((year) => [
    { date: `${year}-01-26`, nameMr: 'प्रजासत्ताक दिन', nameEn: 'Republic Day' },
    { date: `${year}-02-19`, nameMr: 'छत्रपती शिवाजी महाराज जयंती', nameEn: 'Chhatrapati Shivaji Maharaj Jayanti' },
    { date: `${year}-04-14`, nameMr: 'डॉ. बाबासाहेब आंबेडकर जयंती', nameEn: 'Dr. Babasaheb Ambedkar Jayanti' },
    { date: `${year}-05-01`, nameMr: 'महाराष्ट्र दिन / कामगार दिन', nameEn: 'Maharashtra Day / Labour Day' },
    { date: `${year}-08-15`, nameMr: 'स्वातंत्र्य दिन', nameEn: 'Independence Day' },
    { date: `${year}-10-02`, nameMr: 'महात्मा गांधी जयंती', nameEn: 'Mahatma Gandhi Jayanti' },
    { date: `${year}-12-25`, nameMr: 'ख्रिसमस (नाताळ)', nameEn: 'Christmas' },
  ]),
  // 2025 festival public holidays
  { date: '2025-02-26', nameMr: 'महाशिवरात्री', nameEn: 'Maha Shivaratri' },
  { date: '2025-03-14', nameMr: 'धुलिवंदन (होळी)', nameEn: 'Holi (Dhulivandan)' },
  { date: '2025-03-30', nameMr: 'गुढीपाडवा', nameEn: 'Gudi Padwa' },
  { date: '2025-03-31', nameMr: 'रमजान ईद (ईद-उल-फित्र)', nameEn: 'Ramzan Eid (Eid-ul-Fitr)' },
  { date: '2025-04-06', nameMr: 'श्री राम नवमी', nameEn: 'Ram Navami' },
  { date: '2025-04-10', nameMr: 'महावीर जयंती', nameEn: 'Mahavir Jayanti' },
  { date: '2025-04-18', nameMr: 'गुड फ्रायडे', nameEn: 'Good Friday' },
  { date: '2025-05-12', nameMr: 'बुद्ध पौर्णिमा', nameEn: 'Buddha Purnima' },
  { date: '2025-06-07', nameMr: 'बकरी ईद', nameEn: 'Bakri Eid' },
  { date: '2025-08-27', nameMr: 'गणेश चतुर्थी', nameEn: 'Ganesh Chaturthi' },
  { date: '2025-09-05', nameMr: 'ईद-ए-मिलाद', nameEn: 'Eid-e-Milad' },
  { date: '2025-10-20', nameMr: 'नरक चतुर्दशी / दिवाळी', nameEn: 'Diwali' },
  { date: '2025-10-21', nameMr: 'लक्ष्मीपूजन', nameEn: 'Diwali (Laxmi Pujan)' },
  { date: '2025-10-22', nameMr: 'बलिप्रतिपदा (दिवाळी पाडवा)', nameEn: 'Balipratipada (Diwali Padwa)' },
  { date: '2025-11-05', nameMr: 'गुरु नानक जयंती', nameEn: 'Guru Nanak Jayanti' },

  // 2026 festival public holidays
  { date: '2026-02-15', nameMr: 'महाशिवरात्री', nameEn: 'Maha Shivaratri' },
  { date: '2026-03-03', nameMr: 'धुलिवंदन (होळी)', nameEn: 'Holi (Dhulivandan)' },
  { date: '2026-03-19', nameMr: 'गुढीपाडवा', nameEn: 'Gudi Padwa' },
  { date: '2026-03-21', nameMr: 'रमजान ईद (ईद-उल-फित्र)', nameEn: 'Ramzan Eid (Eid-ul-Fitr)' },
  { date: '2026-03-26', nameMr: 'श्री राम नवमी', nameEn: 'Ram Navami' },
  { date: '2026-03-31', nameMr: 'महावीर जयंती', nameEn: 'Mahavir Jayanti' },
  { date: '2026-04-03', nameMr: 'गुड फ्रायडे', nameEn: 'Good Friday' },
  { date: '2026-05-01', nameMr: 'महाराष्ट्र दिन / बुद्ध पौर्णिमा', nameEn: 'Maharashtra Day / Buddha Purnima' },
  { date: '2026-05-27', nameMr: 'बकरी ईद', nameEn: 'Bakri Eid' },
  { date: '2026-06-26', nameMr: 'मोहरम', nameEn: 'Muharram' },
  { date: '2026-08-26', nameMr: 'ईद-ए-मिलाद', nameEn: 'Eid-e-Milad' },
  { date: '2026-09-14', nameMr: 'गणेश चतुर्थी', nameEn: 'Ganesh Chaturthi' },
  { date: '2026-10-20', nameMr: 'दसरा (विजयादशमी)', nameEn: 'Dussehra (Vijayadashami)' },
  { date: '2026-11-08', nameMr: 'लक्ष्मीपूजन (दिवाळी)', nameEn: 'Diwali (Laxmi Pujan)' },
  { date: '2026-11-10', nameMr: 'बलिप्रतिपदा (दिवाळी पाडवा)', nameEn: 'Balipratipada (Diwali Padwa)' },
  { date: '2026-11-24', nameMr: 'गुरु नानक जयंती', nameEn: 'Guru Nanak Jayanti' },

  // 2027 festival public holidays
  { date: '2027-03-06', nameMr: 'महाशिवरात्री', nameEn: 'Maha Shivaratri' },
  { date: '2027-03-22', nameMr: 'धुलिवंदन (होळी)', nameEn: 'Holi (Dhulivandan)' },
  { date: '2027-04-07', nameMr: 'गुढीपाडवा', nameEn: 'Gudi Padwa' },
  { date: '2027-09-04', nameMr: 'गणेश चतुर्थी', nameEn: 'Ganesh Chaturthi' },
  { date: '2027-10-09', nameMr: 'दसरा (विजयादशमी)', nameEn: 'Dussehra (Vijayadashami)' },
  { date: '2027-10-29', nameMr: 'लक्ष्मीपूजन (दिवाळी)', nameEn: 'Diwali (Laxmi Pujan)' },
];

export function hasBuiltInPublicHoliday(isoDate: string): BuiltInHoliday | undefined {
  return BUILT_IN_PUBLIC_HOLIDAYS.find((h) => h.date === isoDate);
}

export function buildPublicHolidayMap(
  customHolidays: PublicHolidayEntry[],
  lang: Language
): Map<string, ResolvedPublicHoliday> {
  const map = new Map<string, ResolvedPublicHoliday>();

  for (const h of BUILT_IN_PUBLIC_HOLIDAYS) {
    map.set(h.date, {
      date: h.date,
      name: lang === 'mr' ? h.nameMr : h.nameEn,
      source: 'builtin',
    });
  }

  for (const custom of customHolidays) {
    if (custom.status === 'removed') {
      map.delete(custom.holidayDate);
    } else {
      map.set(custom.holidayDate, {
        date: custom.holidayDate,
        name: custom.holidayName,
        source: 'custom',
        customEntry: custom,
      });
    }
  }

  return map;
}
