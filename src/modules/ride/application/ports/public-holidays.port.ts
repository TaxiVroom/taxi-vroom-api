import { HolidayZone } from '@modules/ride/domain/ride.types';

export interface PublicHolidaysPort {
  // The public holidays of a year, as "YYYY-MM-DD".
  findPublicHolidays(zone: HolidayZone, year: number): Promise<Set<string>>;
}
