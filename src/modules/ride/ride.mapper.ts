import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { RideEntity } from './domain/ride.entity';
import {
  RideKind,
  RideOffer,
  RideOfferStatus,
  RideProps,
  RideRating,
  RideSchedule,
  RideStatus,
  RideStep,
  RideSupplement,
  RideTiming,
  ScheduleAlert,
  ScheduleDriver,
  ScheduleRefusal,
  ScheduleWithdrawal,
  TaxiTariff,
} from './domain/ride.types';
import { RideResponseDto } from './dtos/ride.response.dto';
import {
  RideEstimateResponseDto,
  TaxiTariffResponseDto,
} from './dtos/ride-estimate.response.dto';

export type RideModel = {
  id: string;
  passengerId: string;
  kind: RideKind;
  status: RideStatus;
  originName: string;
  originLatitude: number;
  originLongitude: number;
  destinationName: string;
  destinationLatitude: number;
  destinationLongitude: number;
  estimatedPriceMinCents: number;
  estimatedPriceMaxCents: number;
  tariffId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RideCompletionModel = {
  completedAt: Date;
  meterCents: number;
  supplements: RideSupplement[];
  rating: RideRating | null;
};

export type RideArrivalModel = {
  arrivedAt: Date;
  start: { startedAt: Date; completion: RideCompletionModel | null } | null;
  noShow: { reportedAt: Date } | null;
};

// The accepted offer with what followed it, each step depending on the
// previous one: acceptance → boarding code, arrival or withdrawal → start or
// no-show → completion.
export type RideAcceptanceModel = {
  acceptedAt: Date;
  boardingCode: { code: string; failedAttempts: number } | null;
  arrival: RideArrivalModel | null;
  withdrawal: { withdrawnAt: Date } | null;
};

// An offer row with its answer: the answer tables keep one date each.
export type RideOfferModel = {
  id: string;
  rideId: string;
  driverId: string;
  status: RideOfferStatus;
  offeredAt: Date;
  acceptance: RideAcceptanceModel | null;
  decline: { declinedAt: Date } | null;
  expiration: { expiredAt: Date } | null;
};

// A booking with its committed driver, the drivers who gave it up and the
// alerts sent.
export type RideScheduleModel = {
  pickupAt: Date;
  tripMeters: number;
  driver: ScheduleDriver | null;
  withdrawals: ScheduleWithdrawal[];
  refusals: ScheduleRefusal[];
  alerts: ScheduleAlert[];
};

// A ride row with its sub-tables, as loaded and saved by the repository.
export type RideRecord = RideModel & {
  offers: RideOfferModel[];
  noDriverFound: { stoppedAt: Date } | null;
  cancellation: { cancelledAt: Date } | null;
  schedule: RideScheduleModel | null;
};

@Injectable()
export class RideMapper
  implements Mapper<RideEntity, RideRecord, RideResponseDto>
{
  toPersistence(entity: RideEntity): RideRecord {
    const props = entity.getProps();
    const step = props.step;
    const schedule = entity.schedule;
    return {
      id: entity.id,
      passengerId: props.passengerId,
      kind: entity.kind,
      status: step.status,
      originName: props.origin.name,
      originLatitude: props.origin.latitude,
      originLongitude: props.origin.longitude,
      destinationName: props.destination.name,
      destinationLatitude: props.destination.latitude,
      destinationLongitude: props.destination.longitude,
      estimatedPriceMinCents: props.estimatedPrice.minCents,
      estimatedPriceMaxCents: props.estimatedPrice.maxCents,
      tariffId: props.tariffId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      offers: props.offers.map((offer) =>
        this.offerToPersistence(entity.id, offer, step),
      ),
      noDriverFound:
        step.status === RideStatus.noDriverFound
          ? { stoppedAt: step.noDriverFoundAt }
          : null,
      cancellation:
        step.status === RideStatus.cancelled
          ? { cancelledAt: step.cancelledAt }
          : null,
      schedule: schedule
        ? {
            pickupAt: schedule.pickupAt,
            tripMeters: schedule.tripMeters,
            driver: schedule.driver,
            withdrawals: schedule.withdrawals,
            refusals: schedule.refusals,
            alerts: schedule.alerts,
          }
        : null,
    };
  }

  toDomain(record: RideRecord): RideEntity {
    return new RideEntity({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      props: {
        passengerId: record.passengerId,
        timing: this.timingToDomain(record),
        origin: {
          name: record.originName,
          latitude: record.originLatitude,
          longitude: record.originLongitude,
        },
        destination: {
          name: record.destinationName,
          latitude: record.destinationLatitude,
          longitude: record.destinationLongitude,
        },
        estimatedPrice: {
          minCents: record.estimatedPriceMinCents,
          maxCents: record.estimatedPriceMaxCents,
        },
        tariffId: record.tariffId,
        step: this.stepToDomain(record),
        offers: [...record.offers]
          .sort((a, b) => a.offeredAt.getTime() - b.offeredAt.getTime())
          .map((offer) => this.offerToDomain(offer)),
      } satisfies RideProps,
    });
  }

  toResponse(entity: RideEntity): RideResponseDto {
    const response = new RideResponseDto();
    response.id = entity.id;
    response.status = entity.status;
    return response;
  }

  toEstimateResponse(
    ride: RideEntity,
    tariff: TaxiTariff,
    approachSeconds: number,
  ): RideEstimateResponseDto {
    const { estimatedPrice } = ride.getProps();
    const response = new RideEstimateResponseDto();
    response.id = ride.id;
    response.minPriceCents = estimatedPrice.minCents;
    response.maxPriceCents = estimatedPrice.maxCents;
    response.pickupEtaMinutes = Math.max(1, Math.round(approachSeconds / 60));
    response.tariff = this.tariffToResponse(tariff);
    return response;
  }

  private tariffToResponse(tariff: TaxiTariff): TaxiTariffResponseDto {
    const response = new TaxiTariffResponseDto();
    response.departmentCode = tariff.departmentCode;
    response.validFrom = tariff.validFrom.toISOString().slice(0, 10);
    response.decree = tariff.decree;
    response.pickupCents = tariff.pickupCents;
    response.kmCentsA = tariff.kmCents.a;
    response.kmCentsB = tariff.kmCents.b;
    response.kmCentsC = tariff.kmCents.c;
    response.kmCentsD = tariff.kmCents.d;
    response.hourlyCents = tariff.hourlyCents;
    response.minimumFareCents = tariff.minimumFareCents;
    response.nightStartMinute = tariff.nightStartMinute;
    response.nightEndMinute = tariff.nightEndMinute;
    return response;
  }

  private offerToPersistence(
    rideId: string,
    offer: RideOffer,
    step: RideStep,
  ): RideOfferModel {
    return {
      id: offer.id,
      rideId,
      driverId: offer.driverId,
      status: offer.status,
      offeredAt: offer.offeredAt,
      acceptance: this.offerAcceptanceToPersistence(offer, step),
      decline:
        offer.status === RideOfferStatus.declined
          ? { declinedAt: offer.declinedAt }
          : null,
      expiration:
        offer.status === RideOfferStatus.expired
          ? { expiredAt: offer.expiredAt }
          : null,
    };
  }

  private offerAcceptanceToPersistence(
    offer: RideOffer,
    step: RideStep,
  ): RideAcceptanceModel | null {
    switch (offer.status) {
      case RideOfferStatus.accepted:
        return this.acceptanceToPersistence(offer.acceptedAt, step);
      case RideOfferStatus.withdrawn:
        // What happened before the withdrawal stays as it was saved.
        return {
          acceptedAt: offer.acceptedAt,
          boardingCode: null,
          arrival: null,
          withdrawal: { withdrawnAt: offer.withdrawnAt },
        };
      default:
        return null;
    }
  }

  // The steps after the acceptance belong to it. The boarding code is only
  // kept while the passenger may need it.
  private acceptanceToPersistence(
    acceptedAt: Date,
    step: RideStep,
  ): RideAcceptanceModel {
    const acceptance = { acceptedAt, boardingCode: null, withdrawal: null };
    switch (step.status) {
      case RideStatus.driverEnRoute:
        return {
          ...acceptance,
          boardingCode: step.boardingCode,
          arrival: null,
        };
      case RideStatus.driverArrived:
        return {
          ...acceptance,
          boardingCode: step.boardingCode,
          arrival: this.arrival(step.arrivedAt),
        };
      case RideStatus.inProgress:
        return {
          ...acceptance,
          arrival: this.arrival(step.arrivedAt, {
            startedAt: step.startedAt,
            completion: null,
          }),
        };
      case RideStatus.completed:
        return {
          ...acceptance,
          arrival: this.arrival(step.arrivedAt, {
            startedAt: step.startedAt,
            completion: { ...step.completion, rating: step.rating },
          }),
        };
      case RideStatus.passengerNoShow:
        return {
          ...acceptance,
          arrival: {
            ...this.arrival(step.arrivedAt),
            noShow: { reportedAt: step.reportedAt },
          },
        };
      default:
        // Cancelled: what happened before stays as it was saved.
        return { ...acceptance, arrival: null };
    }
  }

  private arrival(
    arrivedAt: Date,
    start: RideArrivalModel['start'] = null,
  ): RideArrivalModel {
    return { arrivedAt, start, noShow: null };
  }

  // The kind tells whether ride_schedules holds a row: a missing one is a
  // corrupted ride.
  private timingToDomain(record: RideRecord): RideTiming {
    if (record.kind === RideKind.immediate) {
      return { kind: RideKind.immediate };
    }
    const { pickupAt, tripMeters, driver, withdrawals, refusals, alerts } =
      this.required(record.schedule);
    const schedule: RideSchedule = {
      pickupAt,
      tripMeters,
      driver,
      withdrawals: [...withdrawals].sort(
        (a, b) => a.withdrawnAt.getTime() - b.withdrawnAt.getTime(),
      ),
      refusals,
      alerts,
    };
    return { kind: RideKind.scheduled, schedule };
  }

  // The status tells which sub-table holds the step's data: a missing row is
  // a corrupted ride.
  private stepToDomain(record: RideRecord): RideStep {
    switch (record.status) {
      case RideStatus.estimated:
        return { status: RideStatus.estimated };
      case RideStatus.booked:
        return { status: RideStatus.booked };
      case RideStatus.driverAssigned:
        return { status: RideStatus.driverAssigned };
      case RideStatus.searchingDriver:
        return { status: RideStatus.searchingDriver };
      case RideStatus.noDriverFound:
        return {
          status: RideStatus.noDriverFound,
          noDriverFoundAt: this.required(record.noDriverFound).stoppedAt,
        };
      case RideStatus.driverEnRoute:
        return {
          status: RideStatus.driverEnRoute,
          boardingCode: this.required(this.acceptance(record).boardingCode),
        };
      case RideStatus.driverArrived: {
        const acceptance = this.acceptance(record);
        return {
          status: RideStatus.driverArrived,
          boardingCode: this.required(acceptance.boardingCode),
          arrivedAt: this.required(acceptance.arrival).arrivedAt,
        };
      }
      case RideStatus.inProgress: {
        const arrival = this.required(this.acceptance(record).arrival);
        return {
          status: RideStatus.inProgress,
          arrivedAt: arrival.arrivedAt,
          startedAt: this.required(arrival.start).startedAt,
        };
      }
      case RideStatus.completed: {
        const arrival = this.required(this.acceptance(record).arrival);
        const start = this.required(arrival.start);
        const { rating, ...completion } = this.required(start.completion);
        return {
          status: RideStatus.completed,
          arrivedAt: arrival.arrivedAt,
          startedAt: start.startedAt,
          completion,
          rating,
        };
      }
      case RideStatus.cancelled:
        return {
          status: RideStatus.cancelled,
          cancelledAt: this.required(record.cancellation).cancelledAt,
        };
      case RideStatus.passengerNoShow: {
        const arrival = this.required(this.acceptance(record).arrival);
        return {
          status: RideStatus.passengerNoShow,
          arrivedAt: arrival.arrivedAt,
          reportedAt: this.required(arrival.noShow).reportedAt,
        };
      }
    }
  }

  private acceptance(record: RideRecord): RideAcceptanceModel {
    const accepted = record.offers.find(
      (offer) => offer.status === RideOfferStatus.accepted,
    );
    return this.required(accepted?.acceptance ?? null);
  }

  private offerToDomain(record: RideOfferModel): RideOffer {
    const base = {
      id: record.id,
      driverId: record.driverId,
      offeredAt: record.offeredAt,
    };
    switch (record.status) {
      case RideOfferStatus.pending:
        return { ...base, status: RideOfferStatus.pending };
      case RideOfferStatus.accepted:
        return {
          ...base,
          status: RideOfferStatus.accepted,
          acceptedAt: this.required(record.acceptance).acceptedAt,
        };
      case RideOfferStatus.declined:
        return {
          ...base,
          status: RideOfferStatus.declined,
          declinedAt: this.required(record.decline).declinedAt,
        };
      case RideOfferStatus.expired:
        return {
          ...base,
          status: RideOfferStatus.expired,
          expiredAt: this.required(record.expiration).expiredAt,
        };
      case RideOfferStatus.withdrawn: {
        const acceptance = this.required(record.acceptance);
        return {
          ...base,
          status: RideOfferStatus.withdrawn,
          acceptedAt: acceptance.acceptedAt,
          withdrawnAt: this.required(acceptance.withdrawal).withdrawnAt,
        };
      }
    }
  }

  private required<T>(row: T | null): T {
    if (row === null) {
      throw new Error('Ride: the sub-table row of its status is missing');
    }
    return row;
  }
}
