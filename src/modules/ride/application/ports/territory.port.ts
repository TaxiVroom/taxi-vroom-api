import { Option } from 'oxide.ts';

export interface TerritoryPort {
  // The code of the French département at this point, e.g. "67". None
  // outside France.
  findDepartmentCode(
    latitude: number,
    longitude: number,
  ): Promise<Option<string>>;
}
