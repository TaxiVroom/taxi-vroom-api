import { RepositoryPort } from '@libs/ddd';
import { DriverEntity } from '../domain/driver.entity';

export type DriverRepositoryPort = RepositoryPort<DriverEntity>;
