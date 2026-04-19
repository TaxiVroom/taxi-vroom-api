import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ValidateRegistrationDocumentAdminHttpController } from './commands/validate-registration-document/validate-registration-document.admin.http.controller';

const httpControllers = [ValidateRegistrationDocumentAdminHttpController];

@Module({
  imports: [CqrsModule],
  controllers: [...httpControllers],
})
export class AdminModule {}
