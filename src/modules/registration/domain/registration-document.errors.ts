import { ExceptionBase } from '@libs/exceptions';

export class RegistrationDocumentNotFoundError extends ExceptionBase {
  static readonly message = 'Registration document not found';

  readonly code = 'REGISTRATION_DOCUMENT.NOT_FOUND';

  constructor(cause?: Error, metadata?: unknown) {
    super(RegistrationDocumentNotFoundError.message, cause, metadata);
  }
}

export class DocumentTypeNotFoundError extends ExceptionBase {
  static readonly message = 'Document type not found';

  readonly code = 'REGISTRATION_DOCUMENT.TYPE_NOT_FOUND';

  constructor(cause?: Error, metadata?: unknown) {
    super(DocumentTypeNotFoundError.message, cause, metadata);
  }
}

// The type expires: its date of end of validity is asked. Spec
// docs/specs/documents-du-chauffeur.md.
export class DocumentExpiryRequiredError extends ExceptionBase {
  static readonly message = "Date d'expiration requise";

  readonly code = 'REGISTRATION_DOCUMENT.EXPIRY_REQUIRED';

  constructor(cause?: Error, metadata?: unknown) {
    super(DocumentExpiryRequiredError.message, cause, metadata);
  }
}

export class DocumentExpiredError extends ExceptionBase {
  static readonly message = 'Ce document a déjà expiré';

  readonly code = 'REGISTRATION_DOCUMENT.EXPIRED';

  constructor(cause?: Error, metadata?: unknown) {
    super(DocumentExpiredError.message, cause, metadata);
  }
}

export class DocumentBackRequiredError extends ExceptionBase {
  static readonly message = 'Back side is required for this document type';

  readonly code = 'REGISTRATION_DOCUMENT.BACK_REQUIRED';

  constructor(cause?: Error, metadata?: unknown) {
    super(DocumentBackRequiredError.message, cause, metadata);
  }
}

export class UnsupportedFileTypeError extends ExceptionBase {
  static readonly message = 'Unsupported file type';

  readonly code = 'REGISTRATION_DOCUMENT.UNSUPPORTED_FILE_TYPE';

  constructor(cause?: Error, metadata?: unknown) {
    super(UnsupportedFileTypeError.message, cause, metadata);
  }
}
