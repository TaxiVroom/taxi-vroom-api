import { Injectable } from '@nestjs/common';
import { None, Option, Some } from 'oxide.ts';
import { TerritoryPort } from '@modules/ride/application/ports/territory.port';

// The State's API of French communes: the commune at a point, with its
// département. An empty list outside France.
// https://geo.api.gouv.fr/decoupage-administratif/communes
@Injectable()
export class GeoApiTerritoryAdapter implements TerritoryPort {
  async findDepartmentCode(
    latitude: number,
    longitude: number,
  ): Promise<Option<string>> {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      fields: 'codeDepartement',
      format: 'json',
    });
    const response = await fetch(`https://geo.api.gouv.fr/communes?${params}`);
    if (!response.ok) {
      throw new Error(`geo.api.gouv.fr failed: ${response.status}`);
    }
    const communes: { codeDepartement: string }[] = await response.json();
    return communes.length > 0 ? Some(communes[0].codeDepartement) : None;
  }
}
