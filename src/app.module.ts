import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { UserModule } from '@modules/user/user.module';
import { WalletModule } from '@modules/wallet/wallet.module';
import { RequestContextModule } from 'nestjs-request-context';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ContextInterceptor } from '@libs/application/context/ContextInterceptor';
import { ExceptionInterceptor } from '@libs/application/interceptors/exception.interceptor';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { PrismaModule } from '@libs/db/prisma.module';
import { JobsModule } from '@libs/jobs/jobs.module';
import { AuthModule } from '@modules/auth/auth.module';
import { RegistrationModule } from '@modules/registration/registration.module';
import { PassengerModule } from '@modules/passenger/passenger.module';
import { DriverModule } from '@modules/driver/driver.module';
import { AdminModule } from '@modules/admin/admin.module';
import { RideModule } from '@modules/ride/ride.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { EnterpriseContactModule } from '@modules/enterprise-contact/enterprise-contact.module';
import { validateEnv } from '@config/env.validation';

const interceptors = [
  {
    provide: APP_INTERCEPTOR,
    useClass: ContextInterceptor,
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: ExceptionInterceptor,
  },
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), // Must be first — loads .env and validates all required variables before any other module boots.
    EventEmitterModule.forRoot(),
    // Once, here only: each other forRoot() would run the tasks again.
    ScheduleModule.forRoot(),
    RequestContextModule,
    CqrsModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
    }),

    // Modules
    AuthModule,
    RegistrationModule,
    UserModule,
    WalletModule,
    PassengerModule,
    DriverModule,
    AdminModule,
    RideModule,
    NotificationModule,
    EnterpriseContactModule,
    PrismaModule,
    JobsModule,
  ],
  controllers: [],
  providers: [...interceptors],
})
export class AppModule {}
