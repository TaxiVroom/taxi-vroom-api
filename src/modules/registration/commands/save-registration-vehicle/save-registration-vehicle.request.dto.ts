import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { VehicleColor } from '@modules/registration/domain/registration.types';

export class SaveRegistrationVehicleRequestDto {
  @ApiProperty({ example: 'Renault Austral' })
  @MaxLength(60)
  @MinLength(2)
  @IsString()
  readonly model: string;

  @ApiProperty({ enum: VehicleColor, example: VehicleColor.grey })
  @IsEnum(VehicleColor)
  readonly color: VehicleColor;

  @ApiProperty({
    example: 'AB-123-CD',
    description: 'Current French format; spaces, dashes and case are free.',
  })
  @MaxLength(12)
  @IsString()
  readonly plate: string;

  @ApiProperty({ example: '118', description: 'Autorisation de stationnement' })
  @MaxLength(10)
  @MinLength(1)
  @IsString()
  readonly adsNumber: string;

  @ApiProperty({ example: '67482', description: 'INSEE code of the commune' })
  // Five characters, "2A" or "2B" for Corsica.
  @Matches(/^(\d{2}|2A|2B)\d{3}$/)
  readonly communeCode: string;

  @ApiProperty({ example: 'Strasbourg' })
  @MaxLength(100)
  @MinLength(1)
  @IsString()
  readonly communeName: string;
}
