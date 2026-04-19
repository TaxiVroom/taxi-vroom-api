export enum DocumentStatus {
  SUBMITTED = 'SUBMITTED',
  VALIDATED = 'VALIDATED',
  REJECTED = 'REJECTED',
}

export interface RegistrationDocumentProps {
  driverRegId: string;
  documentTypeId: string;
  frontFilePath: string;
  backFilePath: string | null;
  status: DocumentStatus;
}

export interface CreateRegistrationDocumentProps {
  driverRegId: string;
  documentTypeId: string;
  frontFilePath: string;
  backFilePath: string | null;
}

export const MIME_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
