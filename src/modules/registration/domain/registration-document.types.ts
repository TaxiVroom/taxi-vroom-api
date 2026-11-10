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
  // Null when the document type does not expire.
  expiresAt: Date | null;
  status: DocumentStatus;
}

export interface CreateRegistrationDocumentProps {
  driverRegId: string;
  documentTypeId: string;
  frontFilePath: string;
  backFilePath: string | null;
  expiresAt: Date | null;
}

// What the document's type asks for.
export interface RegistrationDocumentTypeRules {
  expires: boolean;
}

export const MIME_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
