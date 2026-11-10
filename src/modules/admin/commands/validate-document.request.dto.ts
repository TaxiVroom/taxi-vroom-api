import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

// The admin validates a document, and may correct the date read on the
// photo. Spec docs/specs/documents-du-chauffeur.md, point 2.
export class ValidateDocumentRequestDto {
  @ApiProperty({ example: '2030-03-11', required: false })
  @IsOptional()
  @IsISO8601()
  readonly expiresAt?: string;
}
