import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from '@config/env.validation';
import {
  RoutePlannerPort,
  RoutePoint,
} from '@modules/ride/application/ports/route-planner.port';
import { RouteSegment, TaxiRoute } from '@modules/ride/domain/ride.types';

type MapboxLeg = { annotation: { distance: number[]; duration: number[] } };

type MapboxDirections = { code: string; routes: { legs: MapboxLeg[] }[] };

// Mapbox Directions, with the live traffic: one leg from the taxi to the
// pickup, one to the destination. Each leg gives the distance and duration
// between each pair of points of its road ("annotations", which needs
// "overview=full"): https://docs.mapbox.com/api/navigation/directions/
@Injectable()
export class MapboxRoutePlannerAdapter implements RoutePlannerPort {
  private static readonly baseUrl =
    'https://api.mapbox.com/directions/v5/mapbox/driving-traffic';

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  async planTaxiRoute(
    taxi: RoutePoint,
    pickup: RoutePoint,
    destination: RoutePoint,
  ): Promise<TaxiRoute> {
    const [approach, trip] = await this.directions([taxi, pickup, destination]);
    return { approach: this.segments(approach), trip: this.segments(trip) };
  }

  // depart_at: the duration then comes from the usual traffic at that time,
  // mixed with the live one only close to now. Format YYYY-MM-DDThh:mm:ssZ,
  // without milliseconds.
  async planTrip(
    pickup: RoutePoint,
    destination: RoutePoint,
    departsAt: Date,
  ): Promise<RouteSegment[]> {
    const departAt = departsAt.toISOString().replace(/\.\d{3}Z$/, 'Z');
    const [trip] = await this.directions([pickup, destination], {
      depart_at: departAt,
    });
    return this.segments(trip);
  }

  private async directions(
    points: RoutePoint[],
    extraParams: Record<string, string> = {},
  ): Promise<MapboxLeg[]> {
    const coordinates = points
      .map((point) => `${point.longitude},${point.latitude}`)
      .join(';');
    const params = new URLSearchParams({
      annotations: 'distance,duration',
      overview: 'full',
      ...extraParams,
      access_token: this.configService.get('MAPBOX_ACCESS_TOKEN'),
    });
    const response = await fetch(
      `${MapboxRoutePlannerAdapter.baseUrl}/${coordinates}?${params}`,
    );
    const body: MapboxDirections = await response.json();
    if (!response.ok || body.code !== 'Ok' || body.routes.length === 0) {
      throw new Error(`Mapbox Directions failed: ${body.code}`);
    }
    return body.routes[0].legs;
  }

  private segments({ annotation }: MapboxLeg): RouteSegment[] {
    return annotation.distance.map((meters, i) => ({
      meters,
      seconds: annotation.duration[i],
    }));
  }
}
