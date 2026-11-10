import { ApiProperty } from '@nestjs/swagger';
import { DocumentStatus } from '@modules/registration/domain/registration-document.types';

// Intentionally a single class: the discriminated union invariant is already enforced by the domain
export class DocumentReviewResultDto {
  @ApiProperty({ enum: DocumentStatus, example: DocumentStatus.SUBMITTED })
  status: DocumentStatus;

  @ApiProperty({
    example: 'La photo du verso est trop floue.',
    nullable: true,
    required: false,
  })
  rejectionReason?: string;
}

export class UploadedDocumentResponseDto {
  @ApiProperty({ example: '2440d6b5-eded-4fd9-8f89-48e87a210b64' })
  documentTypeId: string;

  @ApiProperty({ type: DocumentReviewResultDto })
  reviewResult: DocumentReviewResultDto;

  @ApiProperty({
    example: '2026-11-20',
    nullable: true,
    description: 'Its last valid day, in Paris, as the driver typed it',
  })
  lastValidDay: string | null;
}
