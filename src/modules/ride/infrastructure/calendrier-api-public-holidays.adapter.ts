import { Injectable } from '@nestjs/common';
import { PublicHolidaysPort } from '@modules/ride/application/ports/public-holidays.port';
import { HolidayZone } from '@modules/ride/domain/ride.types';

// The State's API of public holidays, per zone and year:
// https://calendrier.api.gouv.fr/jours-feries/
@Injectable()
export class CalendrierApiPublicHolidaysAdapter implements PublicHolidaysPort {
  private static readonly zones: Record<HolidayZone, string> = {
    [HolidayZone.metropole]: 'metropole',
    [HolidayZone.alsaceMoselle]: 'alsace-moselle',
  };

  // Public holidays do not change once published: asked once per zone and
  // year while the server runs.
  private readonly cache = new Map<string, Set<string>>();

  async findPublicHolidays(
    zone: HolidayZone,
    year: number,
  ): Promise<Set<string>> {
    const path = `${CalendrierApiPublicHolidaysAdapter.zones[zone]}/${year}`;
    const cached = this.cache.get(path);
    if (cached) return cached;

    const response = await fetch(
      `https://calendrier.api.gouv.fr/jours-feries/${path}.json`,
    );
    if (!response.ok) {
      throw new Error(`calendrier.api.gouv.fr failed: ${response.status}`);
    }
    // { "2026-01-01": "1er janvier", ... }
    const holidays = new Set(Object.keys(await response.json()));
    this.cache.set(path, holidays);
    return holidays;
  }
}
