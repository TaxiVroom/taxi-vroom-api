import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { RegistrationEntity } from './domain/registration.entity';
import { PassengerRegistrationEntity } from './domain/passenger-registration.entity';
import { DriverRegistrationEntity } from './domain/driver-registration.entity';
import { RegistrationResponseDto } from './dtos/registration.response.dto';
import { RegistrationModel } from './database/registration.repository';
import {
  DriverRegistrationStep,
  PassengerRegistrationStep,
  RegistrationBaseProps,
  RegistrationRole,
} from '@modules/registration/domain/registration.types';

@Injectable()
export class RegistrationMapper
  implements
    Mapper<
      RegistrationEntity<RegistrationBaseProps>,
      RegistrationModel,
      RegistrationResponseDto
    >
{
  toPersistence(
    entity: RegistrationEntity<RegistrationBaseProps>,
  ): RegistrationModel {
    const props = entity.getProps();
    return {
      id: props.id,
      userId: props.userId,
      role: props.role,
      phone: props.phone,
      email: props.email,
      firstName: props.firstName,
      lastName: props.lastName,
      currentStep: entity.currentStep,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }

  toDomain(
    record: RegistrationModel,
  ): RegistrationEntity<RegistrationBaseProps> {
    switch (record.role as RegistrationRole) {
      case RegistrationRole.passenger:
        return this.toPassengerEntity(record);
      case RegistrationRole.driver:
        return this.toDriverEntity(record);
    }
  }

  toResponse(
    entity: RegistrationEntity<RegistrationBaseProps>,
  ): RegistrationResponseDto {
    const props = entity.getProps();
    const response = new RegistrationResponseDto(
      entity as PassengerRegistrationEntity,
    );
    response.role = props.role;
    response.currentStep = entity.currentStep;
    response.email = props.email;
    response.firstName = props.firstName;
    response.lastName = props.lastName;
    return response;
  }

  private toPassengerEntity(
    record: RegistrationModel,
  ): PassengerRegistrationEntity {
    return new PassengerRegistrationEntity({
      id: record.id,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      props: {
        userId: record.userId,
        role: record.role as RegistrationRole,
        phone: record.phone,
        email: record.email,
        firstName: record.firstName,
        lastName: record.lastName,
        currentStep: record.currentStep as PassengerRegistrationStep,
      },
    });
  }

  private toDriverEntity(record: RegistrationModel): DriverRegistrationEntity {
    return new DriverRegistrationEntity({
      id: record.id,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      props: {
        userId: record.userId,
        role: record.role as RegistrationRole,
        phone: record.phone,
        email: record.email,
        firstName: record.firstName,
        lastName: record.lastName,
        currentStep: record.currentStep as DriverRegistrationStep,
      },
    });
  }
}
