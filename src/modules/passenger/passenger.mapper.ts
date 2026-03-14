import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { PassengerEntity } from './domain/passenger.entity';
import { PassengerModel } from './database/passenger.repository';
import { PassengerResponseDto } from './dtos/passenger.response.dto';

@Injectable()
export class PassengerMapper
  implements Mapper<PassengerEntity, PassengerModel, PassengerResponseDto>
{
  toPersistence(entity: PassengerEntity): PassengerModel {
    return { userId: entity.id };
  }

  toDomain(record: PassengerModel): PassengerEntity {
    return new PassengerEntity({
      id: record.userId,
      props: { userId: record.userId },
    });
  }

  toResponse(entity: PassengerEntity): PassengerResponseDto {
    const props = entity.getProps();
    const response = new PassengerResponseDto(entity);
    response.userId = props.userId;
    return response;
  }
}
