import { UserRepositoryPort } from './user.repository.port';
import { UserMapper } from '../user.mapper';
import { UserEntity } from '../domain/user.entity';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@libs/db/prisma.service';

export type UserModel = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  country: string;
  postalCode: string;
  street: string;
  role: string;
};

/**
 *  Repository is used for retrieving/saving domain entities
 * */
@Injectable()
export class UserRepository
  extends PrismaRepositoryBase<UserEntity, UserModel>
  implements UserRepositoryPort
{
  protected modelName = 'user';

  constructor(
    prisma: PrismaService,
    mapper: UserMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(prisma, mapper, eventEmitter, new Logger(UserRepository.name));
  }

  async updateAddress(user: UserEntity): Promise<void> {
    const address = user.getProps().address;
    await this.client.user.update({
      where: { id: user.id },
      data: {
        street: address.street,
        country: address.country,
        postalCode: address.postalCode,
      },
    });
    await user.publishEvents(this.logger, this.eventEmitter);
  }

  async findOneByEmail(email: string): Promise<UserEntity> {
    const user = await this.client.user.findUniqueOrThrow({
      where: { email },
    });

    return this.mapper.toDomain(user);
  }
}
