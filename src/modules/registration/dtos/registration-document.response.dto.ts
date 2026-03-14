import { ApiProperty } from '@nestjs/swagger';

export class RegistrationDocumentResponseDto {
  @ApiProperty({ example: 'uuid-...' })
  id: string;

  @ApiProperty({ example: '2440d6b5-eded-4fd9-8f89-48e87a210b64' })
  documentTypeId: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: string;
}

export class SignedDocumentUrlResponseDto {
  @ApiProperty({ example: 'https://storage.googleapis.com/...' })
  url: string;
}
