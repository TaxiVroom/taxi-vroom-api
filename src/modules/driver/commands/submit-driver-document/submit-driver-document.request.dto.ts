import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class SubmitDriverDocumentRequestDto {
  @ApiProperty({
    example: '2031-03-11',
    required: false,
    description: 'Date of end of validity, for a type that expires',
  })
  @IsOptional()
  @IsISO8601()
  readonly expiresAt?: string;

  // For Swagger only: Multer reads the files before the body.
  @ApiProperty({ type: 'string', format: 'binary' })
  readonly front: Express.Multer.File;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  readonly back?: Express.Multer.File;
}
