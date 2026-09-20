/**
 * Bikram Sambat (BS) date conversion utility.
 * Converts Gregorian (AD) dates to Nepali BS dates for display.
 * Reference: 1 Baisakh 2080 BS = 14 April 2023 AD
 */

// Days per month for BS years 2080–2090
const BS_CALENDAR: Record<number, number[]> = {
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2082: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2083: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2084: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2085: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2086: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2087: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2088: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2089: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2090: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
};

const BS_MONTHS_NE = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
  'कात्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत',
];

const WEEKDAYS_NE = [
  'आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार',
  'बिहीबार', 'शुक्रबार', 'शनिबार',
];

const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

function toNepaliNumeral(num: number): string {
  return String(num).replace(/\d/g, (d) => NEPALI_DIGITS[parseInt(d)]);
}

export interface BSDate {
  year: number;
  month: number; // 0-indexed (0 = Baisakh)
  day: number;
}

/**
 * Convert a Gregorian (AD) date to Bikram Sambat (BS).
 * Valid range: April 14 2023 – ~2034.
 */
export function adToBS(adDate: Date): BSDate {
  const refADUtc = Date.UTC(2023, 3, 14); // April 14, 2023
  const adUtc = Date.UTC(adDate.getFullYear(), adDate.getMonth(), adDate.getDate());
  let remaining = Math.floor((adUtc - refADUtc) / 86_400_000);

  if (remaining < 0) {
    return { year: 2080, month: 0, day: 1 };
  }

  let year = 2080;
  let month = 0;

  while (remaining >= 0) {
    const cal = BS_CALENDAR[year];
    if (!cal) break;

    const daysInMonth = cal[month];
    if (remaining < daysInMonth) {
      return { year, month, day: remaining + 1 };
    }
    remaining -= daysInMonth;
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  return { year, month, day: 1 };
}

/**
 * Format a Gregorian date as a Nepali BS date string.
 * Output: "शनिबार, भदौ ३, २०८३"
 */
export function formatBSDate(adDate: Date): string {
  const bs = adToBS(adDate);
  const weekday = adDate.getDay(); // 0 = Sunday
  return `${WEEKDAYS_NE[weekday]}, ${BS_MONTHS_NE[bs.month]} ${toNepaliNumeral(bs.day)}, ${toNepaliNumeral(bs.year)}`;
}
