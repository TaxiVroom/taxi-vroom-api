import { RouteSegment, TaxiRoute } from '@modules/ride/domain/ride.types';

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface RoutePlannerPort {
  // The road from the taxi to the pickup, then to the destination, timed
  // with the traffic of now.
  planTaxiRoute(
    taxi: RoutePoint,
    pickup: RoutePoint,
    destination: RoutePoint,
  ): Promise<TaxiRoute>;

  // The road from the pickup to the destination, timed with the usual
  // traffic at that departure time.
  planTrip(
    pickup: RoutePoint,
    destination: RoutePoint,
    departsAt: Date,
  ): Promise<RouteSegment[]>;
}
