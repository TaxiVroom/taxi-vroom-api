import { Option } from 'oxide.ts';

export interface AddressFinderPort {
  // The address at this point, e.g. "3 Rue du Dôme 67000 Strasbourg". None
  // when it cannot be found: it must never stop a ride from being ordered.
  findAddress(latitude: number, longitude: number): Promise<Option<string>>;
}
