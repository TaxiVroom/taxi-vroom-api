import { RepositoryPort } from '@libs/ddd';
import { PassengerEntity } from '../domain/passenger.entity';

export type PassengerRepositoryPort = RepositoryPort<PassengerEntity>;
