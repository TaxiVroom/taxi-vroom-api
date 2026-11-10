import { ExceptionBase } from '@libs/exceptions';

// A document expired or missing: no going online. Spec
// docs/specs/documents-du-chauffeur.md.
export class DriverDocumentsBlockingError extends ExceptionBase {
  static readonly message = 'Un document expiré ou manquant bloque la conduite';
  public readonly code = 'DRIVER.DOCUMENTS_BLOCKING';
  constructor(cause?: Error, metadata?: unknown) {
    super(DriverDocumentsBlockingError.message, cause, metadata);
  }
}

export class DriverDocumentTypeNotFoundError extends ExceptionBase {
  static readonly message = 'Type de document inconnu';
  public readonly code = 'DRIVER.DOCUMENT_TYPE_NOT_FOUND';
  constructor(cause?: Error, metadata?: unknown) {
    super(DriverDocumentTypeNotFoundError.message, cause, metadata);
  }
}

export class DriverDocumentBackRequiredError extends ExceptionBase {
  static readonly message = 'Le verso est demandé pour ce document';
  public readonly code = 'DRIVER.DOCUMENT_BACK_REQUIRED';
  constructor(cause?: Error, metadata?: unknown) {
    super(DriverDocumentBackRequiredError.message, cause, metadata);
  }
}

export class DriverDocumentExpiryRequiredError extends ExceptionBase {
  static readonly message = "Date d'expiration requise";
  public readonly code = 'DRIVER.DOCUMENT_EXPIRY_REQUIRED';
  constructor(cause?: Error, metadata?: unknown) {
    super(DriverDocumentExpiryRequiredError.message, cause, metadata);
  }
}

export class DriverDocumentExpiredError extends ExceptionBase {
  static readonly message = 'Ce document a déjà expiré';
  public readonly code = 'DRIVER.DOCUMENT_EXPIRED';
  constructor(cause?: Error, metadata?: unknown) {
    super(DriverDocumentExpiredError.message, cause, metadata);
  }
}

export class DriverDocumentSubmissionNotFoundError extends ExceptionBase {
  static readonly message = 'Document envoyé introuvable';
  public readonly code = 'DRIVER.DOCUMENT_SUBMISSION_NOT_FOUND';
  constructor(cause?: Error, metadata?: unknown) {
    super(DriverDocumentSubmissionNotFoundError.message, cause, metadata);
  }
}

export class DriverUnsupportedFileTypeError extends ExceptionBase {
  static readonly message = 'Type de fichier non pris en charge';
  public readonly code = 'DRIVER.UNSUPPORTED_FILE_TYPE';
  constructor(cause?: Error, metadata?: unknown) {
    super(DriverUnsupportedFileTypeError.message, cause, metadata);
  }
}
