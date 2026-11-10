import { ApiProperty } from '@nestjs/swagger';

export class DocumentTypeResponseDto {
  @ApiProperty({ example: '2440d6b5-eded-4fd9-8f89-48e87a210b64' })
  id: string;

  @ApiProperty({ example: 'Permis de conduire' })
  name: string;

  @ApiProperty({
    example: true,
    description: 'Whether the back side must be uploaded',
  })
  backRequired: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether its date of end of validity must be given',
  })
  expires: boolean;
}
