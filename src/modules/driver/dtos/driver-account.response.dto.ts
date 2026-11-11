import { ApiProperty } from '@nestjs/swagger';
import { DriverDocumentsResponseDto } from './driver-document.response.dto';
import { DriverVehicleResponseDto } from './driver-vehicle.response.dto';

// Everything the driver's "Compte" tab shows, in one call.
export class DriverAccountResponseDto {
  @ApiProperty({ example: 'Karim' })
  firstName: string;

  @ApiProperty({ example: 'Benali' })
  lastName: string;

  @ApiProperty({ example: '+33698765432', description: 'E.164 format' })
  phone: string;

  @ApiProperty({ example: 'karim.taxi@exemple.fr' })
  email: string;

  @ApiProperty({
    type: DriverVehicleResponseDto,
    nullable: true,
    description: 'Null: registered before the "Votre taxi" step existed',
  })
  vehicle: DriverVehicleResponseDto | null;

  @ApiProperty({ type: DriverDocumentsResponseDto })
  documents: DriverDocumentsResponseDto;
}
