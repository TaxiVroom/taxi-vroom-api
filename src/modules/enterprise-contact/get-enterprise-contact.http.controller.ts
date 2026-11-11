import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiProperty, ApiResponse } from '@nestjs/swagger';
import { routesV1 } from '@config/app.routes';
import { EnvConfig } from '@config/env.validation';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';

export class EnterpriseContactResponseDto {
  @ApiProperty({ example: '+33612345678', description: 'E.164 format' })
  phone: string;
}

// The number "Nous contacter" calls, the same for everyone: read from the
// environment, not the database. Spec docs/specs/aide-chauffeur.md.
@Controller(routesV1.version)
export class GetEnterpriseContactHttpController {
  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  @ApiOperation({ summary: 'The phone number of "Nous contacter"' })
  @ApiResponse({ status: HttpStatus.OK, type: EnterpriseContactResponseDto })
  @Roles(UserRoles.passenger, UserRoles.driver)
  @Get(routesV1.enterpriseContact.root)
  getEnterpriseContact(): EnterpriseContactResponseDto {
    const contact = new EnterpriseContactResponseDto();
    contact.phone = this.configService.get('CONTACT_PHONE');
    return contact;
  }
}
