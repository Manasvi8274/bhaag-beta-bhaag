// Festival weeks, from the calendar: the street dresses up around Diwali. Add a year's date to keep it going.
const DIWALI = ['2026-11-08', '2027-10-29', '2028-10-17', '2029-11-05', '2030-10-26'];
const day = (s) => Date.parse(`${s}T00:00:00Z`) / 864e5;

// date: 'YYYY-MM-DD'. Diwali week runs from 7 days before to 3 days after. `force` (e.g. ?festival=diwali) for testing.
export function festivalOn(date, force = '') {
  if (force === 'diwali') return 'diwali';
  const d = day(date);
  return DIWALI.some((x) => d >= day(x) - 7 && d <= day(x) + 3) ? 'diwali' : null;
}
