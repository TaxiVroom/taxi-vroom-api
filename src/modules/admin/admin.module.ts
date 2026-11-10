import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ValidateRegistrationDocumentAdminHttpController } from './commands/validate-registration-document/validate-registration-document.admin.http.controller';
import { ValidateDriverDocumentAdminHttpController } from './commands/validate-driver-document/validate-driver-document.admin.http.controller';

const httpControllers = [
  ValidateRegistrationDocumentAdminHttpController,
  ValidateDriverDocumentAdminHttpController,
];

@Module({
  imports: [CqrsModule],
  controllers: [...httpControllers],
})
export class AdminModule {}
