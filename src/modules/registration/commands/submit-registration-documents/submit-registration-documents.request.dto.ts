import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export class SubmitRegistrationDocumentsRequestDto {
  @ApiProperty({
    example: '2440d6b5-eded-4fd9-8f89-48e87a210b64',
    description: 'ID of the document type being uploaded',
  })
  @IsUUID()
  readonly documentTypeId: string;

  @ApiProperty({
    example: '2030-03-11',
    required: false,
    description: 'Date of end of validity, for a type that expires',
  })
  @IsOptional()
  @IsISO8601()
  readonly expiresAt?: string;

  // These fields exist for Swagger documentation ONLY, they are never populated in the body at runtime.
  // Multer intercepts multipart files before NestJS parses the body; files are accessed via @UploadedFiles() in the controller.
  @ApiProperty({ type: 'string', format: 'binary' })
  readonly front: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  readonly back?: Express.Multer.File;
}
