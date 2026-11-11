import { ApiProperty } from '@nestjs/swagger';
import {
  DriverDocumentState,
  DriverDocumentStatesReadModel,
} from '@modules/driver/queries/get-driver-document-states/get-driver-document-states.query-handler';

export class DriverDocumentResponseDto {
  @ApiProperty({ example: 'ba2a7b6c-765c-4fda-a30b-b3485b8913ed' })
  documentTypeId: string;

  @ApiProperty({ example: 'Carte professionnelle de taxi' })
  name: string;

  @ApiProperty({ example: true })
  backRequired: boolean;

  @ApiProperty({
    example: true,
    description: 'Its date of end of validity is asked',
  })
  expires: boolean;

  @ApiProperty({
    enum: DriverDocumentState,
    example: DriverDocumentState.toRenew,
  })
  state: DriverDocumentState;

  @ApiProperty({ example: '2030-03-11T00:00:00.000Z', nullable: true })
  expiresAt: string | null;

  @ApiProperty({
    example: '2030-03-10',
    nullable: true,
    description: 'Its last valid day, in Paris',
  })
  lastValidDay: string | null;

  @ApiProperty({
    example: null,
    nullable: true,
    description: "A new type's deadline",
  })
  requiredFrom: string | null;

  @ApiProperty({
    example: false,
    description: 'A document sent waits for the admin',
  })
  inReview: boolean;
}

export class DriverDocumentsResponseDto {
  @ApiProperty({ type: [DriverDocumentResponseDto] })
  documents: DriverDocumentResponseDto[];

  @ApiProperty({
    example: false,
    description: 'Expired or missing: no going online',
  })
  isBlocked: boolean;

  @ApiProperty({ example: '2030-03-11T00:00:00.000Z', nullable: true })
  inOrderUntil: string | null;

  // One shape for "Vos documents" and the "Compte" tab.
  static fromReadModel(
    states: DriverDocumentStatesReadModel,
  ): DriverDocumentsResponseDto {
    return {
      documents: states.documents.map((document) => ({
        documentTypeId: document.documentTypeId,
        name: document.name,
        backRequired: document.backRequired,
        expires: document.expires,
        state: document.state,
        expiresAt: document.expiresAt?.toISOString() ?? null,
        lastValidDay: document.lastValidDay,
        requiredFrom: document.requiredFrom?.toISOString() ?? null,
        inReview: document.inReview,
      })),
      isBlocked: states.isBlocked,
      inOrderUntil: states.inOrderUntil?.toISOString() ?? null,
    };
  }
}
