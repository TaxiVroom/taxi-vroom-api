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
    const coordinates = [taxi, pickup, destination]
      .map((point) => `${point.longitude},${point.latitude}`)
      .join(';');
    const params = new URLSearchParams({
      annotations: 'distance,duration',
      overview: 'full',
      access_token: this.configService.get('MAPBOX_ACCESS_TOKEN'),
    });
    const response = await fetch(
      `${MapboxRoutePlannerAdapter.baseUrl}/${coordinates}?${params}`,
    );
    const body: MapboxDirections = await response.json();
    if (!response.ok || body.code !== 'Ok' || body.routes.length === 0) {
      throw new Error(`Mapbox Directions failed: ${body.code}`);
    }
    const [approach, trip] = body.routes[0].legs;
    return { approach: this.segments(approach), trip: this.segments(trip) };
  }

  private segments({ annotation }: MapboxLeg): RouteSegment[] {
    return annotation.distance.map((meters, i) => ({
      meters,
      seconds: annotation.duration[i],
    }));
  }
}
