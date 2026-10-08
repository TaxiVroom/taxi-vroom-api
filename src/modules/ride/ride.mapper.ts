import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { RideEntity } from './domain/ride.entity';
import {
  RideOffer,
  RideOfferStatus,
  RideProps,
  RideStatus,
  RideStep,
} from './domain/ride.types';
import { RideResponseDto } from './dtos/ride.response.dto';

export type RideModel = {
  id: string;
  passengerId: string;
  status: RideStatus;
  originName: string | null;
  originLatitude: number;
  originLongitude: number;
  destinationName: string;
  destinationLatitude: number;
  destinationLongitude: number;
  estimatedPriceMinCents: number;
  estimatedPriceMaxCents: number;
  createdAt: Date;
  updatedAt: Date;
};

// An offer row with its answer: the answer tables keep one date each.
export type RideOfferModel = {
  id: string;
  rideId: string;
  driverId: string;
  status: RideOfferStatus;
  offeredAt: Date;
  acceptance: { acceptedAt: Date } | null;
  decline: { declinedAt: Date } | null;
  expiration: { expiredAt: Date } | null;
};

// A ride row with its sub-tables, as loaded and saved by the repository.
export type RideRecord = RideModel & {
  offers: RideOfferModel[];
  noDriverFound: { stoppedAt: Date } | null;
  boardingCode: { codeHash: string } | null;
};

@Injectable()
export class RideMapper
  implements Mapper<RideEntity, RideRecord, RideResponseDto>
{
  toPersistence(entity: RideEntity): RideRecord {
    const props = entity.getProps();
    const step = props.step;
    return {
      id: entity.id,
      passengerId: props.passengerId,
      status: step.status,
      originName: props.origin.name,
      originLatitude: props.origin.latitude,
      originLongitude: props.origin.longitude,
      destinationName: props.destination.name,
      destinationLatitude: props.destination.latitude,
      destinationLongitude: props.destination.longitude,
      estimatedPriceMinCents: props.estimatedPrice.minCents,
      estimatedPriceMaxCents: props.estimatedPrice.maxCents,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      offers: props.offers.map((offer) =>
        this.offerToPersistence(entity, offer),
      ),
      noDriverFound:
        step.status === RideStatus.noDriverFound
          ? { stoppedAt: step.noDriverFoundAt }
          : null,
      boardingCode:
        step.status === RideStatus.driverEnRoute
          ? { codeHash: step.boardingCodeHash }
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

  private offerToPersistence(
    entity: RideEntity,
    offer: RideOffer,
  ): RideOfferModel {
    return {
      id: offer.id,
      rideId: entity.id,
      driverId: offer.driverId,
      status: offer.status,
      offeredAt: offer.offeredAt,
      acceptance:
        offer.status === RideOfferStatus.accepted
          ? { acceptedAt: offer.acceptedAt }
          : null,
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

  // The status tells which sub-table holds the step's data: a missing row is
  // a corrupted ride.
  private stepToDomain(record: RideRecord): RideStep {
    switch (record.status) {
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
          boardingCodeHash: this.required(record.boardingCode).codeHash,
        };
      default:
        throw new Error(
          `Ride ${record.id}: status ${record.status} not handled yet`,
        );
    }
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
    }
  }

  private required<T>(row: T | null): T {
    if (row === null) {
      throw new Error('Ride: the sub-table row of its status is missing');
    }
    return row;
  }
}
