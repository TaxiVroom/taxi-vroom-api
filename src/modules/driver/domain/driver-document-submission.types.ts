// A document sent by a driver, waiting for the admin; the valid one stays
// until it is validated. Spec docs/specs/documents-du-chauffeur.md, point 16.
export interface DriverDocumentSubmissionProps {
  driverId: string;
  documentTypeId: string;
  frontFilePath: string;
  backFilePath: string | null;
  // Null when the document type does not expire.
  expiresAt: Date | null;
}

// What the document's type asks for.
export interface DriverDocumentTypeRules {
  id: string;
  name: string;
  backRequired: boolean;
  expires: boolean;
}
