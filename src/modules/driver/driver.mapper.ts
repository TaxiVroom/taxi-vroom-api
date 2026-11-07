import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { DriverEntity } from './domain/driver.entity';
import { DriverModel } from './database/driver.repository';
import { DriverResponseDto } from './dtos/driver.response.dto';

@Injectable()
export class DriverMapper
  implements Mapper<DriverEntity, DriverModel, DriverResponseDto>
{
  toPersistence(entity: DriverEntity): DriverModel {
    const { vehicle, documents } = entity.getProps();
    return { userId: entity.id, vehicle, documents };
  }

  toDomain(record: DriverModel): DriverEntity {
    return new DriverEntity({
      id: record.userId,
      props: {
        userId: record.userId,
        vehicle: record.vehicle,
        documents: record.documents,
      },
    });
  }

  toResponse(entity: DriverEntity): DriverResponseDto {
    const props = entity.getProps();
    const response = new DriverResponseDto(entity);
    response.userId = props.userId;
    return response;
  }
}
