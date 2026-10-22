import {
  EstimatedPrice,
  RouteSegment,
  TaxiRoute,
  TaxiTariff,
} from './ride.types';

// The meter moves by drops of 0,10 €.
const dropCents = 10;

// The arrêtés come out every year in January-February: older tariffs were
// most likely replaced.
const tariffLifetimeMs = 365 * 24 * 60 * 60_000;

// The tariff hours are French time, whatever the server's time zone.
const frenchClock = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

type KmRates = { day: number; night: number };

type Meter = { cents: number; endsAt: Date };

type FareContext = { tariff: TaxiTariff; publicHolidays: Set<string> };

// What the meter of a French taxi would show, "mode de calcul S" (arrêté du
// 9 juin 2016, annexe IX): over each stretch, the km price or the time price,
// whichever is higher, at the tariff of the hour the taxi drives it. The
// approach from the taxi is charged at A/B (Bas-Rhin arrêté, art. 8). The
// trip goes from a taxi returning with a passenger (A/B) to one returning
// empty (C/D). Supplements are left out: the passenger does not
// tell their luggage yet.
export function estimateFare(
  tariff: TaxiTariff,
  route: TaxiRoute,
  departsAt: Date,
  publicHolidays: Set<string>,
): EstimatedPrice {
  const context = { tariff, publicHolidays };
  const { a, b, c, d } = tariff.kmCents;
  const loaded = { day: a, night: b };
  const approach = runMeter(context, route.approach, loaded, departsAt);
  const fare = (rates: KmRates): number => {
    const trip = runMeter(context, route.trip, rates, approach.endsAt);
    const cents = tariff.pickupCents + approach.cents + trip.cents;
    return Math.max(cents, tariff.minimumFareCents);
  };
  return {
    minCents: Math.floor(fare(loaded) / dropCents) * dropCents,
    maxCents: Math.ceil(fare({ day: c, night: d }) / dropCents) * dropCents,
  };
}

export function isTariffOutdated(tariff: TaxiTariff, now: Date): boolean {
  return now.getTime() - tariff.validFrom.getTime() > tariffLifetimeMs;
}

function runMeter(
  context: FareContext,
  segments: RouteSegment[],
  rates: KmRates,
  startsAt: Date,
): Meter {
  let cents = 0;
  let at = startsAt.getTime();
  for (const segment of segments) {
    const night = isNightTariff(context, new Date(at));
    const kmCents = ((night ? rates.night : rates.day) * segment.meters) / 1000;
    const timeCents = (context.tariff.hourlyCents * segment.seconds) / 3600;
    cents += Math.max(kmCents, timeCents);
    at += segment.seconds * 1000;
  }
  return { cents, endsAt: new Date(at) };
}

// At night, or all day on Sundays and public holidays.
function isNightTariff(context: FareContext, at: Date): boolean {
  const parts = Object.fromEntries(
    frenchClock.formatToParts(at).map((part) => [part.type, part.value]),
  );
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  if (parts.weekday === 'Sun' || context.publicHolidays.has(day)) return true;

  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  const { nightStartMinute: start, nightEndMinute: end } = context.tariff;
  // The night usually goes over midnight, e.g. 19:00 to 07:00.
  return start > end
    ? minute >= start || minute < end
    : minute >= start && minute < end;
}
