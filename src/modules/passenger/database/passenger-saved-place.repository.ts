import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { None, Option, Some } from 'oxide.ts';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { PrismaService } from '@libs/db/prisma.service';
import { PassengerSavedPlaceEntity } from '../domain/passenger-saved-place.entity';
import { SavedPlaceKind } from '../domain/passenger-saved-place.types';
import { PassengerSavedPlaceMapper } from '../passenger-saved-place.mapper';
import { PassengerSavedPlaceRepositoryPort } from './passenger-saved-place.repository.port';

export type PassengerSavedPlaceModel = {
  passengerId: string;
  kind: SavedPlaceKind;
  address: string;
  latitude: number;
  longitude: number;
};

// Keyed by (passengerId, kind), not by id: findOne, save and delete use the
// compound key passengerId_kind.
@Injectable()
export class PassengerSavedPlaceRepository
  extends PrismaRepositoryBase<
    PassengerSavedPlaceEntity,
    PassengerSavedPlaceModel
  >
  implements PassengerSavedPlaceRepositoryPort
{
  protected modelName = 'passengerSavedPlace';

  constructor(
    prisma: PrismaService,
    mapper: PassengerSavedPlaceMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(
      prisma,
      mapper,
      eventEmitter,
      new Logger(PassengerSavedPlaceRepository.name),
    );
  }

  async findOne(
    passengerId: string,
    kind: SavedPlaceKind,
  ): Promise<Option<PassengerSavedPlaceEntity>> {
    const row: PassengerSavedPlaceModel | null = await this.model.findUnique({
      where: { passengerId_kind: { passengerId, kind } },
    });
    return row ? Some(this.mapper.toDomain(row)) : None;
  }

  async save(place: PassengerSavedPlaceEntity): Promise<void> {
    place.validate();
    const { passengerId, kind, address, latitude, longitude } =
      this.mapper.toPersistence(place);
    await this.model.update({
      where: { passengerId_kind: { passengerId, kind } },
      data: { address, latitude, longitude },
    });
    await place.publishEvents(this.logger, this.eventEmitter);
  }

  async delete(place: PassengerSavedPlaceEntity): Promise<boolean> {
    const { passengerId, kind } = place.getProps();
    await this.model.delete({
      where: { passengerId_kind: { passengerId, kind } },
    });
    await place.publishEvents(this.logger, this.eventEmitter);
    return true;
  }
}
