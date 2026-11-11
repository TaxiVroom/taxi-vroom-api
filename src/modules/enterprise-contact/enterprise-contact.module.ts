import { Module } from '@nestjs/common';
import { GetEnterpriseContactHttpController } from './get-enterprise-contact.http.controller';

// "Nous contacter": the enterprise's phone number. No table, no query.
@Module({
  controllers: [GetEnterpriseContactHttpController],
})
export class EnterpriseContactModule {}
