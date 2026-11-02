import { Injectable, Logger } from '@nestjs/common';
import { None, Option, Some } from 'oxide.ts';
import { AddressFinderPort } from '@modules/ride/application/ports/address-finder.port';

type ReverseResponse = { features: { properties: { label: string } }[] };

// The address must not hold the estimate back for long.
const timeoutMs = 2000;

// The State's reverse geocoding, on the Base Adresse Nationale (open licence:
// the results can be kept, unlike Mapbox's without a card on the account).
// Empty outside France. Parameters: https://data.geopf.fr/geocodage/getCapabilities
@Injectable()
export class GeoplateformeAddressFinderAdapter implements AddressFinderPort {
  private readonly logger = new Logger(GeoplateformeAddressFinderAdapter.name);

  async findAddress(
    latitude: number,
    longitude: number,
  ): Promise<Option<string>> {
    const params = new URLSearchParams({
      lon: longitude.toString(),
      lat: latitude.toString(),
      index: 'address',
      limit: '1',
    });
    try {
      const response = await fetch(
        `https://data.geopf.fr/geocodage/reverse?${params}`,
        { signal: AbortSignal.timeout(timeoutMs) },
      );
      if (!response.ok) throw new Error(`status ${response.status}`);
      const { features }: ReverseResponse = await response.json();
      return features.length > 0 ? Some(features[0].properties.label) : None;
    } catch (error) {
      this.logger.warn(`Address not found: ${(error as Error).message}`);
      return None;
    }
  }
}
