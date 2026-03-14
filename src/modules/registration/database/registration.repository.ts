import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { None, Option, Some } from 'oxide.ts';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { PrismaService } from '@libs/db/prisma.service';
import { ConflictException } from '@libs/exceptions';
import { PrismaErrorCode } from '@libs/db/prisma-error.codes';
import type { RegistrationGetPayload } from '@src/generated/prisma/models';
import { RegistrationEntity } from '../domain/registration.entity';
import {
  RegistrationBaseProps,
  RegistrationRole,
} from '../domain/registration.types';
import { RegistrationMapper } from '../registration.mapper';
import { RegistrationRepositoryPort } from './registration.repository.port';

export type RegistrationModel = {
  id: string;
  userId: string;
  role: string;
  phone: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  currentStep: string;
  createdAt: Date;
  updatedAt: Date;
};

type RegistrationWithIncludes = RegistrationGetPayload<{
  include: { passenger: true; driver: true };
}>;

@Injectable()
export class RegistrationRepository
  extends PrismaRepositoryBase<
    RegistrationEntity<RegistrationBaseProps>,
    RegistrationModel
  >
  implements RegistrationRepositoryPort
{
  protected modelName = 'registration';

  constructor(
    prisma: PrismaService,
    mapper: RegistrationMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(
      prisma,
      mapper,
      eventEmitter,
      new Logger(RegistrationRepository.name),
    );
  }

  async findOneById(
    userId: string,
  ): Promise<Option<RegistrationEntity<RegistrationBaseProps>>> {
    const result = await this.client.registration.findUnique({
      where: { userId },
      include: { passenger: true, driver: true },
    });
    if (!result) return None;
    if (result.passenger) {
      return Some(
        this.mapper.toDomain(
          this.flattenRecord(result, result.passenger.currentStep),
        ),
      );
    }
    if (result.driver) {
      return Some(
        this.mapper.toDomain(
          this.flattenRecord(result, result.driver.currentStep),
        ),
      );
    }
    return None;
  }

  async insert(
    entity:
      | RegistrationEntity<RegistrationBaseProps>
      | RegistrationEntity<RegistrationBaseProps>[],
  ): Promise<void> {
    const entities = Array.isArray(entity) ? entity : [entity];
    entities.forEach((e) => e.validate());

    for (const registrationEntity of entities) {
      const props = registrationEntity.getProps();
      try {
        switch (props.role) {
          case RegistrationRole.passenger:
            await this.client.registration.create({
              data: {
                id: props.id,
                userId: props.userId,
                role: props.role,
                phone: props.phone,
                passenger: {
                  create: { currentStep: registrationEntity.currentStep },
                },
              },
            });
            break;
          case RegistrationRole.driver:
            await this.client.registration.create({
              data: {
                id: props.id,
                userId: props.userId,
                role: props.role,
                phone: props.phone,
                driver: {
                  create: { currentStep: registrationEntity.currentStep },
                },
              },
            });
            break;
        }
      } catch (error: any) {
        if (error.code === PrismaErrorCode.UniqueConstraintViolation) {
          throw new ConflictException('Registration already exists', error);
        }
        throw error;
      }
      await registrationEntity.publishEvents(this.logger, this.eventEmitter);
    }
  }

  async update(
    entity: RegistrationEntity<RegistrationBaseProps>,
  ): Promise<void> {
    entity.validate();
    const { id, ...commonData } = this.toRegistrationData(entity);

    switch (commonData.role) {
      case RegistrationRole.passenger:
        await this.client.registration.update({
          where: { id },
          data: {
            ...commonData,
            passenger: { update: { currentStep: entity.currentStep } },
          },
        });
        break;
      case RegistrationRole.driver:
        await this.client.registration.update({
          where: { id },
          data: {
            ...commonData,
            driver: { update: { currentStep: entity.currentStep } },
          },
        });
        break;
      default: {
        const _exhaustive: never = commonData.role;
        throw new Error(`Unhandled registration role: ${_exhaustive}`);
      }
    }

    await entity.publishEvents(this.logger, this.eventEmitter);
  }

  async delete(
    entity: RegistrationEntity<RegistrationBaseProps>,
  ): Promise<boolean> {
    entity.validate();
    await this.client.registration.delete({ where: { userId: entity.id } });
    await entity.publishEvents(this.logger, this.eventEmitter);
    return true;
  }

  private toRegistrationData(
    entity: RegistrationEntity<RegistrationBaseProps>,
  ) {
    const { id, userId, role, phone, email, firstName, lastName } =
      entity.getProps();
    return { id, userId, role, phone, email, firstName, lastName };
  }

  private flattenRecord(
    record: RegistrationWithIncludes,
    currentStep: string,
  ): RegistrationModel {
    return {
      id: record.id,
      userId: record.userId,
      role: record.role,
      phone: record.phone,
      email: record.email,
      firstName: record.firstName,
      lastName: record.lastName,
      currentStep,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
