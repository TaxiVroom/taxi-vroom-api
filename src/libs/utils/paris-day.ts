import { addDays, subMinutes } from 'date-fns';

// "GMT+01:00" in winter, "GMT+02:00" in summer: Paris's offset at a time.
const parisOffset = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Paris',
  timeZoneName: 'longOffset',
});

// "2027-03-11", the day in Paris.
const parisDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function offsetMinutesAt(instant: Date): number {
  const name =
    parisOffset.formatToParts(instant).find((p) => p.type === 'timeZoneName')
      ?.value ?? 'GMT';
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

// A document valid "until 2027-03-11" is valid all that day in Paris: its
// end is 2027-03-12 at 00:00, Paris time. Spec
// docs/specs/documents-du-chauffeur.md, "Fin de validité" (to check with a
// lawyer).
export function endOfParisDay(day: string): Date {
  const midnightUtc = addDays(new Date(`${day}T00:00:00Z`), 1);
  return subMinutes(midnightUtc, offsetMinutesAt(midnightUtc));
}

// The last day still valid, in Paris, for that end: "2027-03-11".
export function lastParisDayBefore(end: Date): string {
  return parisDay.format(subMinutes(end, 1));
}

// 2027-03-11 at 00:00, Paris time.
export function startOfParisDay(day: string): Date {
  const midnightUtc = new Date(`${day}T00:00:00Z`);
  return subMinutes(midnightUtc, offsetMinutesAt(midnightUtc));
}

// The day in Paris at that instant: "2027-03-11".
export function parisDayOf(instant: Date): string {
  return parisDay.format(instant);
}
